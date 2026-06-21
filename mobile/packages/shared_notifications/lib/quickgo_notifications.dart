import 'package:firebase_messaging/firebase_messaging.dart';

class QuickGoNotifications {
  QuickGoNotifications(this._messaging);

  final FirebaseMessaging _messaging;

  Future<String?> bootstrap() async {
    await _messaging.requestPermission();
    return _messaging.getToken();
  }

  Stream<RemoteMessage> get foregroundMessages =>
      FirebaseMessaging.onMessage;
}

