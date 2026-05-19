#import <UIKit/UIKit.h>

#import <UserNotifications/UserNotifications.h>

#import "MAURBackgroundGeolocationFacade.h"

@interface NitroBackgroundGeolocationBootstrap : NSObject <UNUserNotificationCenterDelegate>

@property (nonatomic, weak) id<UNUserNotificationCenterDelegate> prevNotificationDelegate;

@end

@implementation NitroBackgroundGeolocationBootstrap

+ (instancetype)sharedInstance
{
    static NitroBackgroundGeolocationBootstrap *sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedInstance = [[self alloc] init];
    });
    return sharedInstance;
}

+ (void)load
{
    [self sharedInstance];
}

- (instancetype)init
{
    self = [super init];
    if (self == nil) {
        return self;
    }

    NSNotificationCenter *center = [NSNotificationCenter defaultCenter];
    [center addObserver:self selector:@selector(onDidFinishLaunching:) name:UIApplicationDidFinishLaunchingNotification object:nil];
    [center addObserver:self selector:@selector(onDidEnterBackground:) name:UIApplicationDidEnterBackgroundNotification object:nil];
    [center addObserver:self selector:@selector(onWillEnterForeground:) name:UIApplicationWillEnterForegroundNotification object:nil];
    [center addObserver:self selector:@selector(onWillTerminate:) name:UIApplicationWillTerminateNotification object:nil];

    return self;
}

- (void)onDidFinishLaunching:(NSNotification *)notification
{
    MAURBackgroundGeolocationFacade *facade = [MAURBackgroundGeolocationFacade sharedInstance];
    MAURConfig *config = [facade getConfig];

    if (config.isDebugging) {
        if (@available(iOS 10, *)) {
            UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
            if (center.delegate != self) {
                self.prevNotificationDelegate = center.delegate;
                center.delegate = self;
            }
        }
    }

    if ([notification.userInfo objectForKey:UIApplicationLaunchOptionsLocationKey] && ![config stopOnTerminate]) {
        [facade start:nil];
        [facade switchMode:MAURBackgroundMode];
    }
}

- (void)onDidEnterBackground:(NSNotification *)notification
{
    [[MAURBackgroundGeolocationFacade sharedInstance] switchMode:MAURBackgroundMode];
}

- (void)onWillEnterForeground:(NSNotification *)notification
{
    [[MAURBackgroundGeolocationFacade sharedInstance] switchMode:MAURForegroundMode];
}

- (void)onWillTerminate:(NSNotification *)notification
{
    [[MAURBackgroundGeolocationFacade sharedInstance] onAppTerminate];
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler
{
    if (self.prevNotificationDelegate && [self.prevNotificationDelegate respondsToSelector:@selector(userNotificationCenter:willPresentNotification:withCompletionHandler:)])
    {
        [self.prevNotificationDelegate userNotificationCenter:center willPresentNotification:notification withCompletionHandler:^(UNNotificationPresentationOptions options) {
            completionHandler(UNNotificationPresentationOptionAlert);
        }];
    }
    else
    {
        completionHandler(UNNotificationPresentationOptionAlert);
    }
}

@end