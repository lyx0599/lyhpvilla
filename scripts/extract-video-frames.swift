import AVFoundation
import AppKit
import Foundation

guard CommandLine.arguments.count >= 4 else {
    fputs("usage: extract-video-frames.swift <video> <output-dir> <count>\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
let count = max(1, Int(CommandLine.arguments[3]) ?? 8)
try FileManager.default.createDirectory(at: outputURL, withIntermediateDirectories: true)

let asset = AVURLAsset(url: inputURL)
let duration = CMTimeGetSeconds(asset.duration)
guard duration.isFinite, duration > 0 else {
    fputs("unable to read video duration\n", stderr)
    exit(3)
}

let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.maximumSize = CGSize(width: 1600, height: 1600)
generator.requestedTimeToleranceBefore = CMTime(seconds: 0.2, preferredTimescale: 600)
generator.requestedTimeToleranceAfter = CMTime(seconds: 0.2, preferredTimescale: 600)

for index in 0..<count {
    let progress = (Double(index) + 0.5) / Double(count)
    let seconds = duration * progress
    let time = CMTime(seconds: seconds, preferredTimescale: 600)
    let image = try generator.copyCGImage(at: time, actualTime: nil)
    let bitmap = NSBitmapImageRep(cgImage: image)
    guard let data = bitmap.representation(using: .png, properties: [:]) else { continue }
    let fileName = String(format: "frame-%02d-%06.2fs.png", index + 1, seconds)
    try data.write(to: outputURL.appendingPathComponent(fileName))
    print(fileName)
}
