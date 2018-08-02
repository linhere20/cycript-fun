@import com.saurik.substrate.MS;

const util = require("util");

const app = [UIApplication sharedApplication];
const userDefaults = [NSUserDefaults standardUserDefaults];

util.toHumanString = obj => JSON.stringify(obj, null, 4);

(fun => {
	let shouldExportRoot = true;

	fun.cons = {
	};

	fun.ilog = x => NSLog(@"%@", x);

	fun.bundle = () => [[NSBundle mainBundle] infoDictionary];

	fun.bundleId = () => fun.bundle()[@"CFBundleIdentifier"];

	fun.sandbox = () => NSHomeDirectory();

	fun.keyWindow = () => [app keyWindow] || [app.delegate.window];

	fun.urlTypes = () => fun.bundle()["CFBundleURLTypes"].toString();

	fun.openURL = url => [app openURL:[NSURL URLWithString:url]];

	fun.snapshot = () => [[SBScreenShotter sharedInstance] saveScreenshot:YES];

	fun.generalPasteboard = str => {
		let pasteboard = [UIPasteboard generalPasteboard];
		if(str){
			pasteboard.string = str.toString();
		}
		else{
			return pasteboard.string;	
		}
	}

	fun.groupContainers = () => { 
		let proxy = [LSApplicationProxy applicationProxyForIdentifier:fun.bundleId()]
		return [proxy groupContainerURLs].toString()
	}

	fun.evalJSWebView = (webView, js) => {
		if([webView isKindOfClass: [UIWebView class]]){
			NSLog(@"%@", [webView stringByEvaluatingJavaScriptFromString:js]);
		}else if([webView isKindOfClass: [WKWebView class]]){
			[webView evaluateJavaScript:js completionHandler: ^void(id obj, NSError *error){
				NSLog(@"%@", obj);
			}];
		}
	}

	fun.printWebViewDocument = webView => fun.evalJSWebView(webView, @"document.documentElement.innerHTML");

	fun.printMainBundleInfo = () => fun.bundle().toString();

	fun.printUserDefaults = () => [userDefaults dictionaryRepresentation].toString();

	fun.printUI = isAutoLayout => {
		if(isAutoLayout){
			return [fun.keyWindow() _autolayoutTrace].toString();	
		}
		else{
			return [fun.keyWindow() recursiveDescription].toString();
		}
	}

	fun.printVC = () => [[[UIWindow keyWindow] rootViewController] _printHierarchy].toString();

	fun.printMethod = cls => [cls _methodDescription].toString();

	fun.printShortMethod = cls => [cls _shortMethodDescription].toString();

	fun.printVar = ins => [ins _ivarDescription].toString();

	fun.printModules = () => {
		let modules = [];
		let count = _dyld_image_count();	
		for (let i = 0; i < count; i++){
			modules[i] = _dyld_get_image_name(i).toString();
		}
		return util.toHumanString({count, modules});
	}

	fun.printDeviceInfo = () => {
		let device = [UIDevice currentDevice];
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

	fun.findTargetAction = ins => {
		let result = [];
		let targets = [ins allTargets].allObjects();
		for(let i = 0; i < targets.length; i++){
			let target = targets[i];
			let actions = [ins actionsForTarget:target forControlEvent:0];
			result.push({
				target: target,
				actions: actions
			});
		}

		return util.toHumanString(result);
	}

	fun._findCurrentViewController = function(vc) {
		if (vc.presentedViewController) {
        	return fun._findCurrentViewController(vc.presentedViewController);
	    }else if ([vc isKindOfClass:[UITabBarController class]]) {
	        return fun._findCurrentViewController(vc.selectedViewController);
	    } else if ([vc isKindOfClass:[UINavigationController class]]) {
	        return fun._findCurrentViewController(vc.visibleViewController);
	    } else {
	    	var count = vc.childViewControllers.count;
    		for (var i = count - 1; i >= 0; i--) {
    			var childVc = vc.childViewControllers[i];
    			if (childVc && childVc.view.window) {
    				vc = fun._findCurrentViewController(childVc);
    				break;
    			}
    		}
	        return vc;
    	}
	};

	fun.findCurrentViewController = function() {
		return fun._findCurrentViewController(UIApp.keyWindow.rootViewController);
	};

	fun.findSubViews = (cls, parent) => {
		let views = [];
		let _innerFindSubViews = par => {
			[par subviews].map(value => {
				if([value isKindOfClass: cls]){
					views.push(value);
				}
				_innerFindSubViews(value);
			});
		}
		_innerFindSubViews(parent || app.keyWindow);
		return util.toHumanString(views);
	}

	fun.alert = msg => {
		let alert = [[UIAlertView alloc] initWithTitle:"cycript" message:msg.toString() delegate:nil cancelButtonTitle:"OK" otherButtonTitles:nil];
        [alert show];
        return alert;
	}

	fun.unhighlight = view => {
		let tag = 99999;
    	[[view viewWithTag:tag] removeFromSuperview];
    	[view setNeedsDisplay];
	}

	fun.highlight = view => {
		if(![view isKindOfClass: [UIView class]]){
            return;
		}
	    let tag = 99999;
	    fun.unhighlight(view);

	    let bounds = view.bounds;
	    let rect = new CGRect
	    rect->origin = bounds[0];
	    rect->size = bounds[1];

	    let highlight = [[UIView alloc] initWithFrame:*rect];
	    highlight.backgroundColor = [UIColor clearColor];
	    highlight.layer.borderWidth = 3;
	    highlight.layer.borderColor = [[UIColor colorWithRed:0.37 green:0.76 blue:1.00 alpha:1.00] CGColor];
	    highlight.tag = tag;
	    highlight.clipsToBounds = NO;
	    [view addSubview:highlight];
	    [view setNeedsDisplay];
	}

	fun.inputText = text => {
		let keyboard = [UIKeyboardImpl activeInstance];
		[keyboard insertText:text];
	}

	fun.deleteBackward = times => {
		let keyboard = [UIKeyboardImpl activeInstance];
		while(--times >= 0){
     		[keyboard deleteBackward];
    	}
	}

	fun.loadFramework = framework => {
		let frameworkPath = "/System/Library/Frameworks/" + framework + ".framework";
		let privateFrameworkPath = "/System/Library/PrivateFrameworks/" + framework + ".framework";
		let bundle = [NSBundle bundleWithPath: frameworkPath] || [NSBundle bundleWithPath: privateFrameworkPath]; 
		return [bundle load];
	}

	fun.sysctlbyname = key => {
		let sysctlbyname = dlsym(RTLD_DEFAULT, "sysctlbyname");
		sysctlbyname = (typedef int(char*, void*, size_t*, void*, size_t))(sysctlbyname);
		
		let size = new int;
    	sysctlbyname(key, NULL, size, NULL, 0);
    	let p = malloc(*size);
    	let machine = (typedef signed char (*)[*size])(p);
    	sysctlbyname(key, machine, size, NULL, 0);
    	return [NSString stringWithFormat:@"%s", machine];
	}

	/*
		1.logs an instance method: logify(UIView, @selector(setSize:))
		2.logs an class method: logify(object_getClass(UIView), @selector(load))
	*/
	fun.logify = (cls, sel) => {
		let skipMethods = [
			".cxx_destruct",
			"dealloc"
		]

		let selName = sel_getName(sel)
		if(skipMethods.lastIndexOf(selName.toString()) !== -1){
			return;
		}

		let selFormat = selName.replace(/:/g, ":%s ").trim();
		let logFormat = @"%s[<%@: %p> " + selFormat + "] === %s";
		let oldm = {};
		MS.hookMessage(cls, sel, function() {
			let args = [logFormat, class_isMetaClass(cls)? "+": "-", cls, (typedef void *)(this)];
			for (let arg of arguments) {
				args.push(arg.toString());
			}

			let r = oldm->apply(this, arguments);
			args.push(r? r.toString(): null);

			NSLog.apply(null, args);

			return r;
		}, oldm);

		NSLog(@"cycript logify: %s[%s %s]", class_isMetaClass(cls)? "+" : "-", class_getName(cls), sel_getName(sel));
		return oldm;
	}

	/*
		logifyAll(UIView)
	*/
	fun.logifyAll = cls => {
		let clsCount = new int;
		let clsMethods = class_copyMethodList(object_getClass(cls), clsCount);
		for(let i = 0; i < *clsCount; i++){
			let sel = method_getName(clsMethods[i]);
			fun.logify(object_getClass(cls), sel);
		}
		free(clsMethods);

		let insCount = new int;
		let insMethods = class_copyMethodList(cls, insCount);
		for(let i = 0; i < *insCount; i++){
			let sel = method_getName(insMethods[i]);
			fun.logify(cls, sel);
		}
		free(insMethods);
	}

	fun.registerURLProtocol = () => {
		fun.loadURLProtocol = () => {
			@implementation IFunURLProtocol : NSURLProtocol {
			}
			+ (BOOL)canInitWithRequest:(NSURLRequest *)request {
		    	NSLog(@"Req: %@ %@, Headers: %@", request.HTTPMethod, request.URL, request.allHTTPHeaderFields);
		    	return NO;
		  	}
		  	@end
		}

		try {
    		[IFunURLProtocol class];
  		} catch (e) {
    		fun.loadURLProtocol();
  		}

		[NSURLProtocol registerClass:[IFunURLProtocol class]];	
		NSLog(@"Injected custom NSURLProtocol");
	}

	fun.callStackHook = (cls, sel) => {
		let oldm = {};
		MS.hookMessage(cls, sel, function() {
			NSLog(@"%s[%s %s]: %@", class_isMetaClass(cls)? "+" : "-", class_getName(cls), sel_getName(sel), [NSThread callStackSymbols])
			let r = oldm->apply(this, arguments);
			return r;
		}, oldm);
		return oldm;
	}

	fun.CGPointMake = (x, y) => [x, y];

	fun.CGSizeMake = (w, h) => [w, h];

	fun.CGRectMake = (x, y, w, h) => [[x, y], [w, h]];

	fun.buttonTap = btn => [btn sendActionsForControlEvents:UIControlEventTouchUpInside];

	fun.killSSL = () => {};

	Cycript.all["fun"] = fun;
	if(shouldExportRoot){
		for(let k in fun) {
			if(fun.hasOwnProperty(k)) {
				let f = fun[k];
				// if(typeof f === 'function') {
					Cycript.all[k] = f;
				// }
			}
		}	
	}

})({});



