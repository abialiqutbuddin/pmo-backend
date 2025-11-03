import type { Response } from 'express';
export declare class MediaController {
    private proxyImage;
    itsAvatar(itsId: string, res: Response): Promise<void>;
    proxy(url: string, res: Response): Promise<void>;
}
