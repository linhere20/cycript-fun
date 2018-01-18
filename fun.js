@import com.saurik.substrate.MS;

var util = require("util");

var app = [UIApplication sharedApplication];
var userDefaults = [NSUserDefaults standardUserDefaults];

util.toHumanString = function(obj){
	return JSON.stringify(obj, null, 4);
};

UIView.prototype.unhighlight = function(){
	unhighlight(this);
};

UIView.prototype.highlight = function(){
	highlight(this);
};

UIControl.prototype.findTargetAction = function(){
	return findTargetAction(this);
};


(function(fun){

	fun.bundle = function(){
		return [[NSBundle mainBundle] infoDictionary];
	}

	fun.bundleID = function(){
		return [[NSBundle mainBundle] infoDictionary][@"CFBundleIdentifier"];
	}

	fun.sandBox = function(){
		return NSHomeDirectory();
	}

	fun.keyWindow = function(){
		return [app keyWindow] || [app.delegate.window];
	}

	fun.generalPasteboard = function(str){
		var pasteboard = [UIPasteboard generalPasteboard];
		if(str){
			pasteboard.string = str.toString();
		}
		else{
			return pasteboard.string;	
		}
	}

	fun.groupContainers = function(){
		var proxy = [LSApplicationProxy applicationProxyForIdentifier:fun.bundleID()]
		return [proxy groupContainers].toString()
	}

	fun.evalJSWebView = function(webView, js){
		if([webView isKindOfClass: [UIWebView class]]){
			NSLog(@"%@", [webView stringByEvaluatingJavaScriptFromString:js]);
		}else if([webView isKindOfClass: [WKWebView class]]){
			var block = ^void(id obj, NSError *error){
				NSLog(@"%@", obj);
			};
			[webView evaluateJavaScript:js completionHandler: block];
		}
	}

	fun.printUserDefaults = function(){
		return [userDefaults dictionaryRepresentation].toString();
	}

	fun.printUI = function(isAutoLayout){
		if(isAutoLayout){
			return [[app keyWindow] _autolayoutTrace].toString();	
		}
		else{
			return [[app keyWindow] recursiveDescription].toString();
		}
	}

	fun.printVC = function(){
		return [[[UIWindow keyWindow] rootViewController] _printHierarchy].toString();
	}

	fun.printMethod = function(cls){
		return [cls _methodDescription].toString();
	}

	fun.printShortMethod = function(cls){
		return [cls _shortMethodDescription].toString();
	}

	fun.printVar = function(ins){
		return [ins _ivarDescription].toString();
	}

	fun.printModules = function(){
		var modules = [];
		for (var i = 0; i < _dyld_image_count(); i++){
			modules[i] = _dyld_get_image_name(i).toString();
		}
		return util.toHumanString({
			"count": _dyld_image_count(),
			"modules": modules
		});
	}

	fun.printDeviceInfo = function(){
		var device = [UIDevice currentDevice];
		return util.toHumanString({
			IDFA: [[[ASIdentifierManager sharedManager] advertisingIdentifier] UUIDString],
			IDFV: [[device identifierForVendor] UUIDString],
			Name: [device name],
			SystemVersion: [device systemVersion],
			model: [device model],
			ProductType: fun.sysctlbyname("hw.machine"),
			HWModelStr: fun.sysctlbyname("hw.model"),
			BuildVersion: fun.sysctlbyname("kern.osversion")
		})
	}

	fun.findTargetAction = function(ins){
		var result = [];
		var targets = [ins allTargets].allObjects();
		for(var i = 0; i < targets.length; i++){
			var target = targets[i];
			var actions = [ins actionsForTarget:target forControlEvent:0];
			result.push({
				"target": target,
				"actions": actions
			});
		}

		return util.toHumanString(result);
	}

	fun.findCurrentViewController = function(){
		var vc = app.keyWindow.rootViewController;
		while(true){
			if ([vc isKindOfClass:[UITabBarController class]]) {
            	vc = vc.selectedViewController;
        	}
        	if ([vc isKindOfClass:[UINavigationController class]]) {
            	vc = vc.visibleViewController;
        	}
        	if (vc.presentedViewController) {
            	vc = vc.presentedViewController;
        	}else{
            	break;
        	}
		}
		return vc;
	}

	fun.findSubViews = function(cls, parent){
		var views = [];
		function _innerFindSubViews(par){
			[par subviews].map(function(value){
				if([value isKindOfClass: cls]){
					views.push(value);
				}
				_innerFindSubViews(value);
			});
		}
		_innerFindSubViews(parent || app.keyWindow);
		return util.toHumanString(views);
	}

	fun.alert = function(msg){
		var alert = [[UIAlertView alloc] initWithTitle:"cycript" message:msg.toString() delegate:nil cancelButtonTitle:"OK" otherButtonTitles:nil];
        [alert show];
        return alert;
	}

	fun.unhighlight = function(view){
		var tag = 99999;
    	[[view viewWithTag:tag] removeFromSuperview];
    	[view setNeedsDisplay];
	}

	fun.highlight = function(view){
		if(![view isKindOfClass: [UIView class]]){
            return;
		}
	    var tag = 99999;
	    fun.unhighlight(view);

	    var bounds = view.bounds;
	    var rect = new CGRect
	    rect->origin = bounds[0];
	    rect->size = bounds[1];

	    var highlight = [[UIView alloc] initWithFrame:*rect];
	    highlight.backgroundColor = [UIColor clearColor];
	    highlight.layer.borderWidth = 3;
	    highlight.layer.borderColor = [[UIColor colorWithRed:0.37 green:0.76 blue:1.00 alpha:1.00] CGColor];
	    highlight.tag = tag;
	    highlight.clipsToBounds = NO;
	    [view addSubview:highlight];
	    [view setNeedsDisplay];
	}

	fun.inputText = function(text){
		var keyboard = [UIKeyboardImpl activeInstance];
		[keyboard insertText:text];
	}

	fun.deleteBackward = function(times){
		var keyboard = [UIKeyboardImpl activeInstance];
		while(--times >= 0){
     		[keyboard deleteBackward];
    	}
	}

	fun.loadFramework = function(framework){
		var frameworkPath = "/System/Library/Frameworks/" + framework + ".framework";
		var privateFrameworkPath = "/System/Library/PrivateFrameworks/" + framework + ".framework";
		var bundle = [NSBundle bundleWithPath: frameworkPath] || [NSBundle bundleWithPath: privateFrameworkPath]; 
		return [bundle load];
	}

	fun.sysctlbyname = function(key){
		var sysctlbyname = dlsym(RTLD_DEFAULT, "sysctlbyname");
		var sysctlbyname = (typedef int(char*, void*, size_t*, void*, size_t))(sysctlbyname);
		
		var size = new int;
    	sysctlbyname(key, NULL, size, NULL, 0);
    	var p = malloc(*size);
    	var machine = (typedef signed char (*)[*size])(p);
    	sysctlbyname(key, machine, size, NULL, 0);
    	return [NSString stringWithFormat:@"%s", machine];
	}

	fun.registerURLProtocol = function(){
		[NSURLProtocol registerClass:[IFunURLProtocol class]];
	}

	fun.classdump = function(){
		var bundlePath = NSBundle.mainBundle().executablePath;
		NSLog(@"bundle path: %@", bundlePath);
		for (var i = 0; i < _dyld_image_count(); i++){
			modules[i] = _dyld_get_image_name(i).toString();
		}
	}

	fun.killSSL = function(){
	}

	for(var k in fun) {
		if(fun.hasOwnProperty(k)) {
			var f = fun[k];
			if(typeof f === 'function') {
				Cycript.all[k] = f;
			}
		}
	}
})({});


/*
@implementation IFunURLProtocol : NSURLProtocol{
}
+ (BOOL)canInitWithRequest:(NSURLRequest *)request {
    NSLog("HttpRequest: " + request.HTTPMethod + ", url: " + request.URL + ", headers: " + request.allHTTPHeaderFields);
    return NO;
}
@end
*/


