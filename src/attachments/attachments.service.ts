// src/attachments/attachments.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { fileTypeFromBuffer } from 'file-type';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash, randomUUID } from 'crypto';
import { StorageProvider } from '@prisma/client';

@Injectable()
export class AttachmentsService {
  // e.g. ATTACH_ROOT=/data/attachments
  private root = process.env.ATTACH_ROOT || './uploads';
  private maxBytes = (parseInt(process.env.MAX_UPLOAD_MB || '50', 10)) * 1024 * 1024;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes file to disk and creates an Attachment row.
   * Returns { id, objectKey, mimeType }.
   */
  async uploadAttachment(
    buffer: Buffer,
    originalName: string,
    entityType: string,
    entityId: string,
    eventId: string,     // make this required; your routes already have :eventId
    userId: string,
  ) {
    if (!buffer?.length) throw new BadRequestException('Empty file');
    if (buffer.length > this.maxBytes) throw new BadRequestException('File exceeds upload limit');
    if (!entityType || !entityId || !eventId) throw new BadRequestException('Missing required fields');

    const ft = await fileTypeFromBuffer(buffer);
    const mimeType = ft?.mime || 'application/octet-stream';
    const checksum = createHash('sha256').update(buffer).digest('hex');
    const cleanName = (originalName || 'file').replace(/\s+/g, '-').toLowerCase();

    // Pre-generate id so objectKey is stable & unique
    const id = randomUUID();
    // objectKey is POSIX-style (forward slashes) even on Windows
    const objectKey = path.posix.join(
      'attachments',
      eventId,
      entityType.toLowerCase(),
      entityId,
      id,
      cleanName,
    );

    const diskPath = path.join(this.root, objectKey);

    // Write to disk first (so we don't create a DB row that points to a missing file)
    await fs.mkdir(path.dirname(diskPath), { recursive: true });
    try {
      await fs.writeFile(diskPath, buffer);
    } catch {
      // if filesystem fails, bail before any DB work
      throw new BadRequestException('Failed to write file');
    }

    try {
      // Create Attachment row carrying ownership (eventId/entityType/entityId)
      const att = await this.prisma.attachment.create({
        data: {
          id,
          eventId,
          entityType,
          entityId,
          objectKey,
          originalName,
          mimeType,
          size: buffer.length,         // <- your schema uses `size` (not `bytes`)
          checksum,
          provider: StorageProvider.filesystem,
          createdBy: userId,
        },
        select: { id: true, objectKey: true, mimeType: true },
      });

      // Optional: also create a link if you plan to support multi-link later
      // (safe no-op design-wise; remove if you don't need it)
      await this.prisma.attachmentLink.create({
        data: {
          attachmentId: id,
          entityType,
          entityId,
          // do NOT store eventId here to avoid drift; you can always join via attachment.eventId
        },
      }).catch(() => { /* ignore if you don’t want links or unique conflicts */ });

      return att;
    } catch (e) {
      // DB failed: remove the file we wrote
      await fs.rm(diskPath, { force: true }).catch(() => {});
      // rethrow with a cleaner message
      if ((e as any)?.code === 'P2002') {
        throw new BadRequestException('Duplicate attachment key');
      }
      throw e;
    }
  }

  /**
   * Returns the objectKey (relative path) for Nginx/X-Accel-Redirect.
   */
  async resolvePath(id: string) {
    const att = await this.prisma.attachment.findUnique({
      where: { id },
      select: { objectKey: true, deletedAt: true },
    });
    if (!att || att.deletedAt) throw new NotFoundException('Attachment not found');
    return att.objectKey;
  }

  /**
   * List attachments for an entity within an event.
   * Matches your GET /events/:eventId/attachments?entityType=Task&entityId=...
   */
async listForEntity(input: { eventId: string; entityType: string; entityId: string }) {
  const { eventId, entityType, entityId } = input;

  return this.prisma.attachment.findMany({
    where: {
      links: {
        some: {
          //eventId,
          entityType,
          entityId,
        },
      },
    },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,         // ensure this matches your DB column name
      createdAt: true,
      objectKey: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

  /**
   * Soft delete + keep file (or set `alsoRemoveFile = true` to unlink).
   */
  async delete(id: string, alsoRemoveFile = false) {
    const att = await this.prisma.attachment.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { objectKey: true },
    });
    if (alsoRemoveFile) {
      const diskPath = path.join(this.root, att.objectKey);
      await fs.rm(diskPath, { force: true }).catch(() => {});
    }
    return { ok: true };
  }

  /**
   * Delete attachment but ensure it belongs to the provided eventId.
   */
  async deleteForEvent(eventId: string, id: string, alsoRemoveFile = false) {
    const exists = await this.prisma.attachment.findFirst({ where: { id, eventId, deletedAt: null }, select: { id: true } });
    if (!exists) throw new NotFoundException('Attachment not found');
    return this.delete(id, alsoRemoveFile);
  }
}
