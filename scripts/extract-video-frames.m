#import <AppKit/AppKit.h>
#import <AVFoundation/AVFoundation.h>
#import <Foundation/Foundation.h>

int main(int argc, const char *argv[]) {
  @autoreleasepool {
    if (argc < 4) {
      fprintf(stderr, "usage: extract-video-frames <video> <output-dir> <count>\n");
      return 2;
    }

    NSString *inputPath = [NSString stringWithUTF8String:argv[1]];
    NSString *outputPath = [NSString stringWithUTF8String:argv[2]];
    NSInteger count = MAX(1, [[NSString stringWithUTF8String:argv[3]] integerValue]);
    [[NSFileManager defaultManager] createDirectoryAtPath:outputPath
                              withIntermediateDirectories:YES
                                               attributes:nil
                                                    error:nil];

    AVURLAsset *asset = [AVURLAsset URLAssetWithURL:[NSURL fileURLWithPath:inputPath] options:nil];
    Float64 duration = CMTimeGetSeconds(asset.duration);
    if (!isfinite(duration) || duration <= 0) {
      fprintf(stderr, "unable to read duration\n");
      return 3;
    }

    AVAssetImageGenerator *generator = [[AVAssetImageGenerator alloc] initWithAsset:asset];
    generator.appliesPreferredTrackTransform = YES;
    generator.maximumSize = CGSizeMake(1600, 1600);
    generator.requestedTimeToleranceBefore = CMTimeMakeWithSeconds(0.2, 600);
    generator.requestedTimeToleranceAfter = CMTimeMakeWithSeconds(0.2, 600);

    for (NSInteger index = 0; index < count; index++) {
      Float64 seconds = duration * (((double)index + 0.5) / (double)count);
      NSError *error = nil;
      CGImageRef image = [generator copyCGImageAtTime:CMTimeMakeWithSeconds(seconds, 600)
                                          actualTime:nil
                                               error:&error];
      if (!image) {
        fprintf(stderr, "frame %ld failed: %s\n", (long)index, error.localizedDescription.UTF8String);
        continue;
      }
      NSBitmapImageRep *bitmap = [[NSBitmapImageRep alloc] initWithCGImage:image];
      NSData *data = [bitmap representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
      NSString *fileName = [NSString stringWithFormat:@"frame-%02ld-%06.2fs.png", (long)index + 1, seconds];
      [data writeToFile:[outputPath stringByAppendingPathComponent:fileName] atomically:YES];
      printf("%s\n", fileName.UTF8String);
      CGImageRelease(image);
    }
  }
  return 0;
}
