import { BadRequestException, Controller, Get, Query, Res, Param } from '@nestjs/common';
import type { Response } from 'express';
import { Readable } from 'stream';

@Controller('media')
export class MediaController {
  private async proxyImage(url: string, res: Response) {
    // Basic allowlist: only http(s), and disallow localhost/loopback
    let u: URL;
    try { u = new URL(url); } catch { throw new BadRequestException('Invalid url'); }
    if (!/^https?:$/i.test(u.protocol)) throw new BadRequestException('Only http(s) protocol allowed');
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') throw new BadRequestException('Host not allowed');

    const resp = await fetch(u.toString(), { redirect: 'follow' as any });
    if (!resp.ok) { res.status(resp.status).end(); return; }
    const ct = resp.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) { throw new BadRequestException('Not an image'); }

    // Caching headers
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    const lm = resp.headers.get('last-modified');
    if (lm) res.setHeader('Last-Modified', lm);
    res.setHeader('Content-Type', ct);
    const cl = resp.headers.get('content-length');
    if (cl) res.setHeader('Content-Length', cl);
    res.setHeader('Content-Disposition', 'inline');

    const body: any = (resp as any).body;
    if (body && typeof Readable.fromWeb === 'function') {
      Readable.fromWeb(body as any).pipe(res);
    } else if (body && typeof body.pipe === 'function') {
      body.pipe(res as any);
    } else {
      const buf = Buffer.from(await resp.arrayBuffer());
      res.end(buf);
    }
  }

  @Get('avatar/its/:itsId')
  async itsAvatar(@Param('itsId') itsId: string, @Res() res: Response) {
    const id = (itsId || '').trim();
    if (!/^\d{7,8}$/.test(id)) throw new BadRequestException('Invalid ITS id');
    const url = `https://followup.qardanhasana.in/assets/img/mumin_photos/${id}.jpg`;
    return this.proxyImage(url, res);
  }

  @Get('proxy')
  async proxy(@Query('url') url: string, @Res() res: Response) {
    if (!url) throw new BadRequestException('url is required');
    return this.proxyImage(url, res);
  }
}

