import UserNotifications
import AVFoundation

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?
    var audioPlayer: AVAudioPlayer?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let content = bestAttemptContent else {
            contentHandler(request.content)
            return
        }

        let rawSound = (request.content.userInfo["sound"] as? String)
            ?? (request.content.userInfo["aps"] as? [String: Any])?["sound"] as? String
            ?? ""

        if rawSound.contains("adhan") {
            content.sound = nil
            playSound(named: "adhan_mishary_rashid_alafasy", withExtension: "caf")
        } else if !rawSound.isEmpty && rawSound != "default" {
            let parts = rawSound.split(separator: ".")
            let name = String(parts.first ?? Substring(rawSound))
            let ext = parts.count > 1 ? String(parts.last!) : "caf"
            playSound(named: name, withExtension: ext)
        }

        contentHandler(content)
    }

    override func serviceExtensionTimeWillExpire() {
        audioPlayer?.stop()
        if let contentHandler = contentHandler, let content = bestAttemptContent {
            contentHandler(content)
        }
    }

    private func playSound(named name: String, withExtension ext: String) {
        guard let url = Bundle.main.url(forResource: name, withExtension: ext) else {
            bestAttemptContent?.sound = UNNotificationSound.default
            return
        }

        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .default,
                options: [.mixWithOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true)

            audioPlayer = try AVAudioPlayer(contentsOf: url)
            audioPlayer?.prepareToPlay()
            audioPlayer?.play()
        } catch {
            bestAttemptContent?.sound = UNNotificationSound.default
        }
    }
}
