import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:webview_windows/webview_windows.dart';
import 'package:path/path.dart' as p;

void main() {
  runApp(const AdminManagerApp());
}

class AdminManagerApp extends StatelessWidget {
  const AdminManagerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Admin Manager App',
      theme: ThemeData(
        primarySwatch: Colors.green,
      ),
      home: const AdminManagerWebView(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class AdminManagerWebView extends StatefulWidget {
  const AdminManagerWebView({super.key});

  @override
  State<AdminManagerWebView> createState() => _AdminManagerWebViewState();
}

class _AdminManagerWebViewState extends State<AdminManagerWebView> {
  late WebviewController _controller;
  bool _isInitialized = false;

  final List<Map<String, String>> _adminPages = [
    {
      'title': 'Live Orders',
      'path': '/owner-live-order-dashboard',
      'key': 'owner-live-order-dashboard',
      'icon': 'dashboard'
    },
    {
      'title': 'Table Management',
      'path': '/table-management-history',
      'key': 'table-management-history',
      'icon': 'table'
    },
    {
      'title': 'Billing & Payment',
      'path': '/billing-payment-management',
      'key': 'billing-payment-management',
      'icon': 'payment'
    },
    {
      'title': 'Analytics',
      'path': '/analytics-reporting-dashboard',
      'key': 'analytics-reporting-dashboard',
      'icon': 'analytics'
    },
    {
      'title': 'Settings',
      'path': '/settings',
      'key': 'settings',
      'icon': 'settings'
    },
  ];

  String? _baseUrl;

  @override
  void initState() {
    super.initState();
    _initializeWebView();
  }

  Future<void> _initializeWebView() async {
    try {
      _controller = WebviewController();
      await _controller.initialize();
      // Decide whether to use dev server or bundled file
      const devHost = 'localhost';
      const devPort = 5173;
      String baseUrl = '';

      // Quick TCP probe to localhost:5173 to see if dev server is listening
      try {
        final socket = await Socket.connect(devHost, devPort, timeout: const Duration(milliseconds: 400));
        socket.destroy();
        baseUrl = 'http://$devHost:$devPort';
      } catch (_) {
        // not available -> fallback to bundled build
      }

      // If dev server not available, try a few likely locations for the bundled build
      if (baseUrl.isEmpty) {
        final exePath = Platform.resolvedExecutable;
        final exeDir = File(exePath).parent.path;

        // Candidate paths to check (relative to exe dir)
        final candidates = [
          p.join(exeDir, 'restaurantflow', 'build', 'index.html'),
          p.join(exeDir, '..', 'restaurantflow', 'build', 'index.html'),
          p.join(exeDir, '..', '..', 'restaurantflow', 'build', 'index.html'),
        ];

        for (final cand in candidates) {
          try {
            final f = File(cand);
            if (await f.exists()) {
              baseUrl = Uri.file(f.absolute.path).toString();
              break;
            }
          } catch (_) {}
        }

        if (baseUrl.isEmpty) {
          // Last resort: try the workspace relative path (useful during development/run-from-IDE)
          final workspaceCandidate = p.joinAll([Directory.current.path, 'restaurantflow', 'build', 'index.html']);
          try {
            final wf = File(workspaceCandidate);
            if (await wf.exists()) baseUrl = Uri.file(wf.absolute.path).toString();
          } catch (_) {}
        }

        if (baseUrl.isEmpty) {
          // As a safe fallback, use the usual dev base so errors are still visible in dev.
          baseUrl = 'http://$devHost:$devPort';
        }
      }

  // Load the default page (Live Orders dashboard)
  _baseUrl = baseUrl;
  final defaultUrl = _pageUrl('owner-live-order-dashboard', _baseUrl!);
  await _controller.loadUrl(defaultUrl);

  // Write a small runtime log next to the exe so we can debug user machines if the view stays blank
  try {
    final exePath = Platform.resolvedExecutable;
    final exeDir = File(exePath).parent;
    final logFile = File(p.join(exeDir.path, 'admin_manager_app.log'));
    await logFile.writeAsString('requestedUrl=$defaultUrl\nbase=$baseUrl\n', mode: FileMode.write);
  } catch (e) {
    // best-effort
  }

  // Wait until the page is reasonably loaded before injecting our navigation script.
  // Some hosts (file://) may still be parsing large bundles; poll document.readyState with a timeout.
  Future<bool> waitForReady(Duration timeout) async {
    final end = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(end)) {
      try {
        final res = await _controller.executeScript('document.readyState');
        if (res != null) {
          final state = res.toString().toLowerCase();
          if (state.contains('complete') || state.contains('interactive')) return true;
        }
      } catch (_) {}
      await Future.delayed(const Duration(milliseconds: 200));
    }
    return false;
  }

  final ready = await waitForReady(const Duration(seconds: 6));
  try {
    final exePath = Platform.resolvedExecutable;
    final exeDir = File(exePath).parent;
    final logFile = File(p.join(exeDir.path, 'admin_manager_app.log'));
    await logFile.writeAsString('pageReady=$ready\n', mode: FileMode.append);
  } catch (_) {}

  // Ensure SPA opens the owner live-order dashboard by injecting a small script.
  // This sets a role hint and forces the hash route so the client-side router navigates.
  try {
    await _controller.executeScript('''(function(){try{window.__APP_ROLE=window.__APP_ROLE||'owner'; if(!location.hash || location.hash=='' || location.hash=='#/'){location.hash='/owner-live-order-dashboard';} try{window.dispatchEvent(new PopStateEvent('popstate'));}catch(e){} }catch(e){} })();''');
  } catch (e) {
    // ignore
  }
      
      // Comprehensive scrolling fix for all elements
      await _controller.executeScript('''
        (function() {
          // Enable universal mouse wheel scrolling
          function enableScrolling() {
            // Remove any existing scroll listeners
            document.removeEventListener('wheel', handleWheel, true);
            
            // Add comprehensive wheel event handler
            function handleWheel(e) {
              e.preventDefault();
              e.stopPropagation();
              
              // Get scroll target (current element or body)
              let target = e.target;
              while (target && target !== document.body) {
                if (target.scrollHeight > target.clientHeight) {
                  target.scrollTop += e.deltaY;
                  return;
                }
                target = target.parentElement;
              }
              
              // Fallback to window scroll
              window.scrollBy({
                top: e.deltaY,
                left: e.deltaX,
                behavior: 'auto'
              });
            }
            
            // Add listener with capture to catch all events
            document.addEventListener('wheel', handleWheel, { 
              passive: false, 
              capture: true 
            });
            
            // Enable smooth scrolling
            document.documentElement.style.scrollBehavior = 'auto';
            document.body.style.scrollBehavior = 'auto';
            
            // Fix any overflow issues
            document.body.style.overflow = 'auto';
            document.documentElement.style.overflow = 'auto';
            
            // Enable touch scrolling for touch devices
            document.body.style.touchAction = 'pan-y';
            
            // Apply to all scrollable elements
            const scrollableElements = document.querySelectorAll('*');
            scrollableElements.forEach(el => {
              if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
                el.style.overflow = 'auto';
                el.style.touchAction = 'pan-y pan-x';
              }
            });
          }
          
          // Apply scrolling immediately
          enableScrolling();
          
          // Re-apply when DOM changes
          const observer = new MutationObserver(enableScrolling);
          observer.observe(document.body, { 
            childList: true, 
            subtree: true 
          });
          
          // Re-apply on page load
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', enableScrolling);
          }
          
          // Re-apply on window load
          window.addEventListener('load', enableScrolling);
        })();
      ''');
      
      setState(() {
        _isInitialized = true;
      });
    } catch (e) {
      debugPrint('Error initializing WebView: $e');
    }
  }

  IconData _getIcon(String iconName) {
    switch (iconName) {
      case 'dashboard':
        return Icons.dashboard;
      case 'table':
        return Icons.table_restaurant;
      case 'payment':
        return Icons.payment;
      case 'analytics':
        return Icons.analytics;
      case 'settings':
        return Icons.settings;
      default:
        return Icons.web;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Manager App'),
        backgroundColor: Colors.green[600],
        foregroundColor: Colors.white,
        actions: [
          PopupMenuButton<String>(
            onSelected: (String page) {
              // compute base (use cached if available)
              (() async {
                final base = _baseUrl ?? await _detectBase();
                final url = _pageUrl(page, base);
                await _controller.loadUrl(url);
              })();
            },
            itemBuilder: (BuildContext context) {
              return _adminPages.map((page) {
                return PopupMenuItem<String>(
                  value: page['key'],
                  child: Row(
                    children: [
                      Icon(
                        _getIcon(page['icon']!),
                        size: 20,
                        color: Colors.grey[700],
                      ),
                      const SizedBox(width: 12),
                      Text(page['title']!),
                    ],
                  ),
                );
              }).toList();
            },
            icon: const Icon(Icons.menu),
          ),
        ],
      ),
      body: _isInitialized
          ? Webview(
              _controller,
              permissionRequested: (url, kind, isUserInitiated) =>
                  WebviewPermissionDecision.allow,
            )
          : const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Loading Admin Manager App...'),
                  SizedBox(height: 8),
                  Text(
                    'Make sure the web server is running on localhost:5173',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ),
      floatingActionButton: _isInitialized
          ? FloatingActionButton(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Quick Navigation'),
                    content: Column(
                      mainAxisSize: MainAxisSize.min,
                        children: _adminPages.map((page) {
                          return ListTile(
                            leading: Icon(_getIcon(page['icon']!)),
                            title: Text(page['title']!),
                            onTap: () async {
                              final base = _baseUrl ?? await _detectBase();
                              final url = _pageUrl(page['key']!, base);
                              await _controller.loadUrl(url);
                              if (!context.mounted) return;
                              Navigator.of(context).pop();
                            },
                          );
                        }).toList(),
                    ),
                  ),
                );
              },
              backgroundColor: Colors.green[600],
              child: const Icon(Icons.apps, color: Colors.white),
            )
          : null,
    );
  }

  // Helper: compute the base URL used by the app (dev server if available, else file:// path)
  Future<String> _detectBase() async {
    const host = 'localhost';
    const port = 5173;

    // TCP probe
    try {
      final s = await Socket.connect(host, port, timeout: const Duration(milliseconds: 400));
      s.destroy();
      return 'http://$host:$port';
    } catch (_) {}

    // Look for bundled index.html near the exe
    try {
      final exePath = Platform.resolvedExecutable;
      final exeDir = File(exePath).parent.path;
      final candidates = [
        p.join(exeDir, 'restaurantflow', 'build', 'index.html'),
        p.join(exeDir, '..', 'restaurantflow', 'build', 'index.html'),
        p.join(exeDir, '..', '..', 'restaurantflow', 'build', 'index.html'),
      ];
      for (final cand in candidates) {
        try {
          final f = File(cand);
          if (await f.exists()) return Uri.file(f.absolute.path).toString();
        } catch (_) {}
      }
    } catch (_) {}

    // workspace relative fallback
    try {
      final wf = File(p.join(Directory.current.path, 'restaurantflow', 'build', 'index.html'));
      if (await wf.exists()) return Uri.file(wf.absolute.path).toString();
    } catch (_) {}

    return 'http://$host:$port';
  }

  String _pageUrl(String key, String base) {
    final page = _adminPages.firstWhere((p) => p['key'] == key);
    final path = page['path'] ?? '/';
    if (base.startsWith('http')) {
      return base.replaceAll(RegExp(r'/$'), '') + path;
    }
    // For file:// bundled index.html, use hash routing so the client-side SPA can pick up the route
    // e.g. file:///.../index.html#/owner-live-order-dashboard
    if (base.contains('#')) {
  final cleaned = base.replaceAll(RegExp(r'#.*$'), '');
  return '$cleaned#$path';
    }
    // For file:// bundling, append a hash route so the SPA navigates to the correct page
    // Ensure path starts with '/'
    final hashPath = path.startsWith('/') ? path : '/$path';
    // Remove trailing fragment from base if present
    final cleanBase = base.replaceAll(RegExp(r'#.*$'), '');
    return '$cleanBase#$hashPath';
  }
}
