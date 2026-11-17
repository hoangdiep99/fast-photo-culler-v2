import fs from 'fs';
import path from 'path';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface DigikamBinariesStatus {
  installed: boolean;
  installPath: string;
  hasExifTool: boolean;
  hasFFmpeg: boolean;
  hasShowFoto: boolean;
  hasDigikamExe: boolean;
}

export class DigikamBinariesManager {
  private installPath: string = '';

  constructor() {
    this.detect();
  }

  public detect(): DigikamBinariesStatus {
    const candidatePaths = [
      'C:\\Program Files\\digiKam',
      'C:\\Program Files (x86)\\digiKam',
      process.env.DIGIKAM_PATH || ''
    ].filter(Boolean);

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        this.installPath = p;
        break;
      }
    }

    return this.getStatus();
  }

  public getStatus(): DigikamBinariesStatus {
    const p = this.installPath;
    const hasExifTool = fs.existsSync(path.join(p, 'exiftool.exe'));
    const hasFFmpeg = fs.existsSync(path.join(p, 'ffmpeg.exe'));
    const hasShowFoto = fs.existsSync(path.join(p, 'showfoto.exe'));
    const hasDigikamExe = fs.existsSync(path.join(p, 'digikam.exe'));

    return {
      installed: !!p && (hasDigikamExe || hasShowFoto),
      installPath: p,
      hasExifTool,
      hasFFmpeg,
      hasShowFoto,
      hasDigikamExe
    };
  }

  public getExifToolPath(): string {
    return path.join(this.installPath, 'exiftool.exe');
  }

  public getFFmpegPath(): string {
    return path.join(this.installPath, 'ffmpeg.exe');
  }

  public getShowFotoPath(): string {
    return path.join(this.installPath, 'showfoto.exe');
  }

  public getDigikamExePath(): string {
    return path.join(this.installPath, 'digikam.exe');
  }

  /**
   * Run ExifTool from digiKam core to read metadata
   */
  public async readExifWithDigikam(filePath: string): Promise<any> {
    const exiftoolExe = this.getExifToolPath();
    if (!fs.existsSync(exiftoolExe)) return null;

    try {
      const { stdout } = await execFileAsync(exiftoolExe, ['-j', '-n', filePath]);
      const json = JSON.parse(stdout);
      return json && json.length > 0 ? json[0] : null;
    } catch (err) {
      console.error('[digiKam ExifTool] Error reading metadata:', err);
      return null;
    }
  }

  /**
   * Run ExifTool from digiKam core to write Rating & ColorLabel
   */
  public async writeExifWithDigikam(filePath: string, rating?: number, colorLabel?: string): Promise<boolean> {
    const exiftoolExe = this.getExifToolPath();
    if (!fs.existsSync(exiftoolExe)) return false;

    const args: string[] = ['-overwrite_original'];
    if (rating !== undefined) {
      args.push(`-Rating=${rating}`, `-xmp:Rating=${rating}`);
    }
    if (colorLabel && colorLabel !== 'none') {
      args.push(`-Label=${colorLabel}`, `-xmp:Label=${colorLabel}`);
    }
    args.push(filePath);

    try {
      await execFileAsync(exiftoolExe, args);
      console.log(`[digiKam ExifTool] Successfully updated EXIF for ${filePath}`);
      return true;
    } catch (err) {
      console.error('[digiKam ExifTool] Error writing metadata:', err);
      return false;
    }
  }

  /**
   * Extract video preview thumbnail using digiKam's FFmpeg binary
   */
  public async extractVideoThumbnail(videoPath: string, outputPath: string): Promise<boolean> {
    const ffmpegExe = this.getFFmpegPath();
    if (!fs.existsSync(ffmpegExe)) return false;

    try {
      await execFileAsync(ffmpegExe, [
        '-ss', '00:00:01',
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2',
        '-y',
        outputPath
      ]);
      return fs.existsSync(outputPath);
    } catch (err) {
      console.error('[digiKam FFmpeg] Error extracting video thumbnail:', err);
      return false;
    }
  }

  /**
   * Open photo directly in digiKam or showFoto
   */
  public openInShowFoto(filePath: string): boolean {
    const showFotoExe = this.getShowFotoPath();
    if (fs.existsSync(showFotoExe)) {
      spawn(showFotoExe, [filePath], { detached: true, stdio: 'ignore' }).unref();
      return true;
    }
    return false;
  }

  public openInDigikam(filePath: string): boolean {
    const digikamExe = this.getDigikamExePath();
    if (fs.existsSync(digikamExe)) {
      spawn(digikamExe, [filePath], { detached: true, stdio: 'ignore' }).unref();
      return true;
    }
    return false;
  }
}

export const digikamBinariesManager = new DigikamBinariesManager();
