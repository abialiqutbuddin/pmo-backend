import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';
import * as tls from 'tls';

type SendArgs = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

@Injectable()
export class MailerService {
  private readonly logger = new Logger('MailerService');

  // Read env, tolerate common typos from provided setup
  private host = process.env.SMTP_HOST || process.env.SMPT_HOST_ || '';
  private port = Number(process.env.SMTP_PORT || '0');
  private user = process.env.SMTP_USER || '';
  private pass = process.env.SMTP_PASS || process.env.SMPTP_PASS || '';
  private from = process.env.SMTP_FROM || '';
  private secure =
    String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' ||
    this.port === 465;

  // Optional TLS verify toggle (useful for self-hosted SMTP)
  private rejectUnauthorized =
    String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false';

  private get configured() {
    return !!(this.host && this.port && this.from);
  }

  private getAuthPass() {
    // Normalize Gmail App Password (remove spaces)
    const looksGmail = /gmail\.com|google/i.test(this.host || '') || /@gmail\.com$/i.test(this.user || '');
    if (looksGmail && /\s/.test(this.pass || '')) return (this.pass || '').replace(/\s+/g, '');
    return this.pass;
  }

  async send(args: SendArgs): Promise<void> {
    if (!this.configured) {
      this.logger.warn(
        `Mailer not configured; skip email to ${args.to} [subject=${args.subject}]`,
      );
      return;
    }
    try {
      // Prefer nodemailer if available (handles STARTTLS, OAuth, etc.)
      const used = await this.tryNodeMailer(args).catch(() => false);
      if (!used) {
        await this.smtpSend(args);
      }
    } catch (e: any) {
      this.logger.error(
        `Failed to send email to ${args.to}: ${e?.message || e}`,
      );
    }
  }

  // Try to use nodemailer if installed; otherwise return false
  private async tryNodeMailer(args: SendArgs): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port || 587,
        secure: this.secure, // true for 465, false otherwise (STARTTLS negotiated by nodemailer)
        auth: this.user && this.getAuthPass() ? { user: this.user, pass: this.getAuthPass() } : undefined,
      });
      await transporter.sendMail({
        from: this.from,
        to: args.to,
        subject: args.subject,
        text: args.text,
        html: args.html,
      });
      return true;
    } catch {
      return false;
    }
  }

  // ---- low-level SMTP helpers ------------------------------------------------

  private readReply(sock: net.Socket | tls.TLSSocket, timeoutMs = 15000): Promise<string> {
    return new Promise((resolve, reject) => {
      let buf = '';
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          cleanup();
          reject(new Error('SMTP read timeout'));
        }
      }, timeoutMs);

      const onData = (data: Buffer) => {
        buf += data.toString('utf8');

        // Split into lines; SMTP reply is done when the last non-empty line is "xyz <text>"
        // Multiline replies use "xyz-..." for intermediate lines and "xyz ..." for the final line.
        const lines = buf.split(/\r?\n/).filter(l => l.length > 0);
        const last = lines[lines.length - 1];
        if (last && /^\d{3}\s/.test(last)) {
          done = true;
          cleanup();
          resolve(buf);
        }
      };
      const onErr = (err: any) => {
        if (!done) {
          done = true;
          cleanup();
          reject(err);
        }
      };
      const cleanup = () => {
        clearTimeout(timer);
        sock.off('data', onData);
        sock.off('error', onErr);
      };

      sock.on('data', onData);
      sock.once('error', onErr);
    });
  }

  private async expectOK(sock: net.Socket | tls.TLSSocket) {
    const res = await this.readReply(sock);
    if (!/^(2|3)\d{2}/m.test(res)) {
      throw new Error(`SMTP error: ${res}`);
    }
    return res;
  }

  private write(sock: net.Socket | tls.TLSSocket, s: string) {
    return new Promise<void>((resolve, reject) => {
      sock.write(s, err => (err ? reject(err) : resolve()));
    });
  }

  private parseEmailAddress(v: string): string {
    if (!v) return '';
    const trimmed = v.trim();
    const angle = trimmed.match(/<([^>]+)>/);
    if (angle) return angle[1].trim();
    const mailto = trimmed.replace(/^mailto:/i, '');
    return mailto;
  }

  private heloName(): string {
    const env = process.env.SMTP_EHLO_NAME?.trim();
    if (env) return env;
    // try to use domain from FROM address
    const fromAddr = this.parseEmailAddress(this.from || '');
    const at = fromAddr.indexOf('@');
    if (at > 0) return `pmo.${fromAddr.slice(at + 1)}`;
    return 'localhost.localdomain';
  }

  private connectPlain(): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection({ host: this.host, port: this.port }, () => resolve(sock));
      sock.once('error', reject);
      sock.setTimeout(15000, () => {
        sock.destroy();
        reject(new Error('SMTP connect timeout'));
      });
    });
  }

  private connectTLS(existing?: net.Socket): Promise<tls.TLSSocket> {
    return new Promise((resolve, reject) => {
      const opt: tls.ConnectionOptions = existing
        ? { socket: existing, servername: this.host, rejectUnauthorized: this.rejectUnauthorized }
        : { host: this.host, port: this.port, servername: this.host, rejectUnauthorized: this.rejectUnauthorized };

      const sock = tls.connect(opt, () => resolve(sock));
      sock.once('error', reject);
      sock.setTimeout(15000, () => {
        sock.destroy();
        reject(new Error('SMTP TLS connect timeout'));
      });
    });
  }

  // ---- main SMTP flow --------------------------------------------------------

  private async smtpSend({ to, subject, text, html }: SendArgs) {
    let sock: net.Socket | tls.TLSSocket;

    // Implicit TLS (465) vs. Plain (587 -> STARTTLS)
    if (this.secure) {
      sock = await this.connectTLS();
    } else {
      sock = await this.connectPlain();
    }

    try {
      await this.expectOK(sock);                              // Greeting

      await this.write(sock, `EHLO ${this.heloName()}\r\n`);  // EHLO (multiline)
      const caps = await this.expectOK(sock);

      // STARTTLS if we're not already in TLS and server supports it
      if (!this.secure && /STARTTLS/i.test(caps)) {
        await this.write(sock, `STARTTLS\r\n`);
        await this.expectOK(sock);

        // Upgrade the plain socket to TLS
        sock = await this.connectTLS(sock as net.Socket);

        // EHLO again after TLS
        await this.write(sock, `EHLO ${this.heloName()}\r\n`);
        await this.expectOK(sock);
      }

      // AUTH LOGIN if creds are provided
      if (this.user && this.pass) {
        await this.write(sock, `AUTH LOGIN\r\n`);
        const step1 = await this.readReply(sock);
        if (!/^334/m.test(step1)) throw new Error(`SMTP AUTH error: ${step1}`);

        await this.write(sock, Buffer.from(this.user.trim(), 'utf8').toString('base64') + `\r\n`);
        const step2 = await this.readReply(sock);
        if (!/^334/m.test(step2)) throw new Error(`SMTP AUTH error: ${step2}`);

        const pw = this.getAuthPass() || '';
        await this.write(sock, Buffer.from(pw, 'utf8').toString('base64') + `\r\n`);
        const step3 = await this.readReply(sock);
        if (!/^235/m.test(step3)) throw new Error(`SMTP AUTH failed: ${step3}`);
      }

      const mailFrom = this.parseEmailAddress(this.from);
      await this.write(sock, `MAIL FROM:<${mailFrom}>\r\n`);
      await this.expectOK(sock);

      const rcptTo = this.parseEmailAddress(to);
      await this.write(sock, `RCPT TO:<${rcptTo}>\r\n`);
      await this.expectOK(sock);

      await this.write(sock, `DATA\r\n`);
      await this.expectOK(sock);

      // Build headers/body
      const boundary = '=_mail_' + Math.random().toString(36).slice(2);
      const headers = [
        `From: ${this.from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        html
          ? `Content-Type: multipart/alternative; boundary="${boundary}"`
          : `Content-Type: text/plain; charset=utf-8`,
      ].join('\r\n');

      const body = html
        ? [
            `\r\n--${boundary}`,
            `Content-Type: text/plain; charset=utf-8`,
            `\r\n${text || ''}`,
            `\r\n--${boundary}`,
            `Content-Type: text/html; charset=utf-8`,
            `\r\n${html}`,
            `\r\n--${boundary}--`,
            ''
          ].join('\r\n')
        : `\r\n${text || ''}`;

      // NOTE: we’re not dot-stuffing here; for simple content it’s fine.
      await this.write(sock, headers + '\r\n' + body + '\r\n.\r\n');
      await this.expectOK(sock);

      await this.write(sock, `QUIT\r\n`);
      // let server close
    } finally {
      // Close after a short grace period
      setTimeout(() => {
        try { sock.end(); } catch {}
        try { (sock as any).destroy?.(); } catch {}
      }, 100);
    }
  }

  // Convenience wrapper for task assignment notifications
  async sendTaskAssignedEmail(params: {
    to: string; assigneeName?: string; taskTitle: string; departmentName?: string; eventName?: string; actorName?: string;
  }) {
    const subj = `[${params.eventName || 'Event'}] Task assigned: ${params.taskTitle}`;
    const greeting = params.assigneeName ? `Dear ${params.assigneeName},` : 'Hello,';
    const who = params.actorName ? ` by ${params.actorName}` : '';
    const dept = params.departmentName ? ` in ${params.departmentName}` : '';
    const text = `${greeting}\n\nYou have been assigned a task${dept}${who}.\n\nTask: ${params.taskTitle}\n\nThanks.`;
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;">
        <p>${greeting}</p>
        <p>You have been <strong>assigned</strong> a task${dept}${who}.</p>
        <p><strong>Task:</strong> ${this.escapeHtml(params.taskTitle)}</p>
        <p>Thanks.</p>
      </div>`;
    await this.send({ to: params.to, subject: subj, text, html });
  }

  private escapeHtml(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
  }
}
