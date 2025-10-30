import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:webview_windows/webview_windows.dart';
import 'package:path/path.dart' as p;

void main() {
	WidgetsFlutterBinding.ensureInitialized();
	runApp(const MyApp());
}

class MyApp extends StatelessWidget {
	const MyApp({super.key});

	@override
	Widget build(BuildContext context) {
		return const MaterialApp(
			debugShowCheckedModeBanner: false,
			home: WebViewHost(),
		);
	}
}

class WebViewHost extends StatefulWidget {
	const WebViewHost({super.key});

	@override
	State<WebViewHost> createState() => _WebViewHostState();
}

class _WebViewHostState extends State<WebViewHost> {
	final _controller = WebviewController();

	StreamSubscription<String>? _urlSub;
	bool _serverAvailable = false;
	late String _fileUri;
	late String _httpWaiterUrl;

	@override
	void initState() {
		super.initState();
		initWebview();
	}

	Future<void> initWebview() async {
		try {
			await _controller.initialize();
			await _controller.setBackgroundColor(Colors.transparent);

			// Prevent popup windows (open in new window) from being created
			try {
				await _controller.setPopupWindowPolicy(WebviewPopupWindowPolicy.deny);
			} catch (_) {}

			// Inject an in-page guard to block navigation to admin pages (defense-in-depth).
			// This script runs before any document is parsed and prevents or redirects
			// navigation that would take the app outside allowed waiter routes.
			try {
				// Ensure the page runtime knows it's running in the waiter host. This
				// helps the web app detect runtime and permanently render waiter UI.
				try {
					await _controller.addScriptToExecuteOnDocumentCreated('window.__IS_WAITER = true;');
				} catch (_) {}

				final guardScript = '''
(function(){
	try {
		var allowed = ['/waiter-order-taking','/table-management-history','/table-management','/tables','/waiter'];
		function isAllowedUrl(href) {
			try {
				var u = href || location.href || '';
				var lower = (u + '').toLowerCase();
				for (var i = 0; i < allowed.length; i++) {
					if (lower.indexOf(allowed[i]) !== -1) return true;
				}
			} catch (e) {}
			return false;
		}
		if (!isAllowedUrl(location.href)) {
			// Redirect into waiter route
			if (location.protocol === 'file:') {
				location.replace(location.pathname + '#/waiter-order-taking');
			} else {
				location.replace('/waiter-order-taking');
			}
		}
		window.addEventListener('hashchange', function(){ if (!isAllowedUrl(location.href)) location.replace('/waiter-order-taking'); });
		window.addEventListener('popstate', function(){ if (!isAllowedUrl(location.href)) location.replace('/waiter-order-taking'); });
		document.addEventListener('click', function(e){
			try {
				var a = e.target.closest && e.target.closest('a');
				if (a && a.getAttribute) {
					var href = a.getAttribute('href') || a.href;
					if (href && !isAllowedUrl(href)) { e.preventDefault(); location.replace('/waiter-order-taking'); }
				}
			} catch (ex){}
		}, true);
	} catch (err){}
})();
''';
				await _controller.addScriptToExecuteOnDocumentCreated(guardScript);
			} catch (e) {
				debugPrint('Failed to inject guard script: $e');
			}

			// Listen to URL changes and enforce allowed-routes policy
			_urlSub = _controller.url.listen((currentUrl) async {
				final lower = currentUrl.toLowerCase();
				bool allowed = false;
				try {
					final uri = Uri.parse(currentUrl);
					final path = uri.path.toLowerCase();
					final frag = uri.fragment.toLowerCase();
					final combined = '$path#$frag';
					final allowedList = [
						'/waiter-order-taking',
						'/table-management-history',
						'/table-management',
						'/tables',
						'/waiter'
					];
					for (final a in allowedList) {
						if (combined.contains(a) || lower.contains(a)) {
							allowed = true;
							break;
						}
					}
				} catch (e) {
					// Fallback check when parse fails
					allowed = lower.contains('/waiter-order-taking') || lower.contains('/table-management') || lower.contains('/tables');
				}
				if (!allowed) {
					// Redirect back to primary waiter route
					final target = _serverAvailable ? _httpWaiterUrl : '$_fileUri#/waiter-order-taking';
					try {
						await _controller.stop();
						await _controller.loadUrl(target);
					} catch (e) {
						debugPrint('Failed to redirect from $currentUrl to $target: $e');
					}
				}
			});

				// Determine production build index.html path by trying several
				// candidate locations (exe-based and workspace-based). This is more
				// robust when the app is packaged or launched from different cwd.
				final exePath = Platform.resolvedExecutable;
				final exeDir = p.dirname(exePath);
				final workDir = Directory.current.path;
				final candidates = <String>[
					// near the exe: ../../../../restaurantflow/build/index.html
					p.normalize(p.join(exeDir, '..', '..', '..', '..', 'restaurantflow', 'build', 'index.html')),
					// near the exe: ../../../restaurantflow/build/index.html
					p.normalize(p.join(exeDir, '..', '..', '..', 'restaurantflow', 'build', 'index.html')),
					// near the exe: ../../restaurantflow/build/index.html
					p.normalize(p.join(exeDir, '..', '..', 'restaurantflow', 'build', 'index.html')),
					// workspace relative: <cwd>/restaurantflow/build/index.html
					p.normalize(p.join(workDir, 'restaurantflow', 'build', 'index.html')),
					// workspace parent: ../restaurantflow/build/index.html
					p.normalize(p.join(workDir, '..', 'restaurantflow', 'build', 'index.html')),
				];
				String? found;
				for (final c in candidates) {
					try {
						if (await File(c).exists()) {
							found = c;
							break;
						}
					} catch (_) {}
				}
				if (found != null) {
					_fileUri = Uri.file(found).toString();
					debugPrint('Using local build at: $found');
					try {
						await _controller.loadUrl('$_fileUri#/waiter-order-taking');
						return;
					} catch (e) {
						debugPrint('Failed to load local build file: $e');
					}
				}

				// If local build isn't found or failed to load, try backend-served build first, then dev server.
				final fallbacks = <String>[
					'http://localhost:5001/waiter-order-taking', // backend serves built SPA
					'http://127.0.0.1:5001/waiter-order-taking',
					'http://localhost:5173/waiter-order-taking', // vite dev server
				];
				String? reachable;
				for (final url in fallbacks) {
					try {
						final client = HttpClient();
						client.connectionTimeout = const Duration(milliseconds: 1200);
						final uri = Uri.parse(url);
						final req = await client.getUrl(uri).timeout(const Duration(milliseconds: 1200));
						final resp = await req.close().timeout(const Duration(milliseconds: 1200));
						if (resp.statusCode == 200) {
							reachable = url;
							client.close(force: true);
							break;
						}
						client.close(force: true);
					} catch (_) {}
				}
				_httpWaiterUrl = reachable ?? fallbacks.last;
				await _controller.loadUrl(_httpWaiterUrl);

			setState(() {});
		} catch (e) {
			debugPrint('Webview init error: $e');
		}
	}

	@override
	void dispose() {
		_urlSub?.cancel();
		_controller.dispose();
		super.dispose();
	}

	@override
	Widget build(BuildContext context) {
		return Scaffold(
			backgroundColor: Colors.white,
			body: SafeArea(
				child: _controller.value.isInitialized
						? Webview(_controller)
						: const Center(child: CircularProgressIndicator()),
			),
		);
	}
}
