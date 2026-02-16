#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SenderrNotificationsModule, NSObject)

RCT_EXTERN_METHOD(
  requestPermission:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  registerDeviceToken:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  registerMessagingToken:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
