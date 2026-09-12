using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace LoLRandomizer
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            AppDomain.CurrentDomain.UnhandledException += delegate (object s, UnhandledExceptionEventArgs e)
            {
                try { File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "crash.log"), e.ExceptionObject != null ? e.ExceptionObject.ToString() : "Unknown crash"); } catch { }
            };
            Application.ThreadException += delegate (object s, System.Threading.ThreadExceptionEventArgs e)
            {
                try { File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "crash.log"), e.Exception != null ? e.Exception.ToString() : "Unknown thread exception"); } catch { }
            };
            Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            try
            {
                Application.Run(new MainForm());
            }
            catch (Exception ex)
            {
                try { File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "crash.log"), ex.ToString()); } catch { }
            }
        }
    }

    public class MainForm : Form
    {
        [DllImport("user32.dll")]
        public static extern bool ReleaseCapture();

        [DllImport("user32.dll")]
        public static extern IntPtr SendMessage(IntPtr hWnd, int Msg, int wParam, int lParam);

        private const int WM_NCLBUTTONDOWN = 0xA1;
        private const int HT_CAPTION = 0x2;

        private const int WM_NCHITTEST = 0x84;
        private const int HTBORDER = 18;
        private const int HTBOTTOM = 15;
        private const int HTBOTTOMLEFT = 16;
        private const int HTBOTTOMRIGHT = 17;
        private const int HTLEFT = 10;
        private const int HTRIGHT = 11;
        private const int HTTOP = 12;
        private const int HTTOPLEFT = 13;
        private const int HTTOPRIGHT = 14;

        private WebView2 _webView;
        private HttpListener _fallbackListener;
        private volatile bool _isRunning = true;
        private byte[] _embeddedHtml = null;

        public MainForm()
        {
            ServicePointManager.ServerCertificateValidationCallback = delegate { return true; };
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
            ServicePointManager.DefaultConnectionLimit = 64;
            ServicePointManager.Expect100Continue = false;

            this.Text = "League of Customs v0.5";
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Size = new Size(1260, 860);
            this.MinimumSize = new Size(960, 680);
            this.BackColor = Color.FromArgb(1, 10, 19);

            try
            {
                string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "assets", "app.ico");
                if (!File.Exists(iconPath))
                {
                    iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app.ico");
                }
                if (File.Exists(iconPath))
                {
                    this.Icon = new Icon(iconPath);
                }
            }
            catch { }

            LoadEmbeddedHtml();

            _webView = new WebView2();
            _webView.Dock = DockStyle.Fill;
            _webView.DefaultBackgroundColor = Color.FromArgb(1, 10, 19);
            this.Controls.Add(_webView);

            StartFallbackHttpServer();

            InitializeWebViewAsync();
        }

        protected override void WndProc(ref Message m)
        {
            base.WndProc(ref m);

            // Allow border resizing on borderless form
            if (m.Msg == WM_NCHITTEST && (int)m.Result == 1) // HTCLIENT
            {
                Point p = this.PointToClient(new Point(m.LParam.ToInt32()));
                int border = 8;

                if (p.X < border && p.Y < border) m.Result = (IntPtr)HTTOPLEFT;
                else if (p.X > this.ClientSize.Width - border && p.Y < border) m.Result = (IntPtr)HTTOPRIGHT;
                else if (p.X < border && p.Y > this.ClientSize.Height - border) m.Result = (IntPtr)HTBOTTOMLEFT;
                else if (p.X > this.ClientSize.Width - border && p.Y > this.ClientSize.Height - border) m.Result = (IntPtr)HTBOTTOMRIGHT;
                else if (p.X < border) m.Result = (IntPtr)HTLEFT;
                else if (p.X > this.ClientSize.Width - border) m.Result = (IntPtr)HTRIGHT;
                else if (p.Y < border) m.Result = (IntPtr)HTTOP;
                else if (p.Y > this.ClientSize.Height - border) m.Result = (IntPtr)HTBOTTOM;
            }
        }

        private async void InitializeWebViewAsync()
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string appFolder = Path.Combine(localAppData, "LeagueOfCustoms");
                if (!Directory.Exists(appFolder)) Directory.CreateDirectory(appFolder);
                string userDataFolder = Path.Combine(appFolder, "WebView2Data");

                var options = new CoreWebView2EnvironmentOptions();
                options.AdditionalBrowserArguments = "--disable-background-timer-throttling=false --disable-renderer-backgrounding=false";
                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder, options);
                await _webView.EnsureCoreWebView2Async(env);

                _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                _webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
                _webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;

                _webView.CoreWebView2.PermissionRequested += delegate (object s, CoreWebView2PermissionRequestedEventArgs args)
                {
                    if (args.PermissionKind == CoreWebView2PermissionKind.ClipboardRead)
                    {
                        args.State = CoreWebView2PermissionState.Allow;
                        args.Handled = true;
                    }
                };

                _webView.CoreWebView2.NewWindowRequested += delegate (object s, CoreWebView2NewWindowRequestedEventArgs args)
                {
                    args.Handled = true;
                    try
                    {
                        string uri = args.Uri ?? "";
                        if (Regex.IsMatch(uri, @"\.(png|jpe?g|webp|gif|svg)($|\?)", RegexOptions.IgnoreCase) || uri.Contains("cmsassets.rgpub.io") || uri.Contains("images.contentstack.io"))
                        {
                            var ser = new JavaScriptSerializer();
                            var dict = new Dictionary<string, object>
                            {
                                { "lightboxType", "open-image" },
                                { "url", uri }
                            };
                            this.Invoke((Action)delegate
                            {
                                try { _webView.CoreWebView2.PostWebMessageAsString(ser.Serialize(dict)); } catch { }
                            });
                            return;
                        }
                        Process.Start(new ProcessStartInfo(uri) { UseShellExecute = true });
                    }
                    catch { }
                };

                _webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;

                string localPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "src", "index.html");
                if (!File.Exists(localPath))
                {
                    localPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "index.html");
                }

                // Ensure disk HTML in AppData is always refreshed from latest embedded binary
                string diskHtmlPath = Path.Combine(appFolder, "index.html");
                if (_embeddedHtml != null && _embeddedHtml.Length > 0)
                {
                    try
                    {
                        File.WriteAllBytes(diskHtmlPath, _embeddedHtml);
                        if (!File.Exists(localPath))
                        {
                            localPath = diskHtmlPath;
                        }
                    }
                    catch { }
                }

                if (File.Exists(localPath))
                {
                    _webView.CoreWebView2.Navigate(new Uri(localPath).AbsoluteUri);
                }
                else if (_embeddedHtml != null && _embeddedHtml.Length > 0)
                {
                    string html = Encoding.UTF8.GetString(_embeddedHtml);
                    _webView.CoreWebView2.NavigateToString(html);
                }
                else
                {
                    _webView.CoreWebView2.NavigateToString("<html><body style='background:#010a13;color:#f0e6d3;font-family:sans-serif;'><h3>League of Customs: index.html not found.</h3></body></html>");
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to initialize WebView2: " + ex.Message, "League of Customs", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                string msg = e.TryGetWebMessageAsString();
                if (string.IsNullOrEmpty(msg)) return;

                if (msg == "minimize")
                {
                    this.WindowState = FormWindowState.Minimized;
                }
                else if (msg == "close")
                {
                    this.Close();
                    Application.Exit();
                }
                else if (msg == "drag")
                {
                    ReleaseCapture();
                    SendMessage(this.Handle, WM_NCLBUTTONDOWN, HT_CAPTION, 0);
                }
                else if (msg.StartsWith("open-url:"))
                {
                    string url = msg.Substring("open-url:".Length);
                    try
                    {
                        Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
                    }
                    catch { }
                }
                else if (msg.StartsWith("copy-clipboard:"))
                {
                    string text = msg.Substring("copy-clipboard:".Length);
                    try
                    {
                        Clipboard.SetText(text);
                    }
                    catch { }
                }
                else if (msg == "read-clipboard")
                {
                    try
                    {
                        string clipText = "";
                        this.Invoke((Action)delegate
                        {
                            try
                            {
                                if (Clipboard.ContainsText()) clipText = Clipboard.GetText();
                            }
                            catch { }
                        });
                        var ser = new JavaScriptSerializer();
                        var dict = new Dictionary<string, object>
                        {
                            { "clipboardType", "clipboard-text" },
                            { "text", clipText }
                        };
                        _webView.CoreWebView2.PostWebMessageAsString(ser.Serialize(dict));
                    }
                    catch { }
                }
                else if (msg.StartsWith("save-user-data:"))
                {
                    string jsonPayload = msg.Substring("save-user-data:".Length);
                    Task.Run(() =>
                    {
                        try
                        {
                            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                            string locFolder = Path.Combine(appData, "LeagueOfCustoms");
                            if (!Directory.Exists(locFolder)) Directory.CreateDirectory(locFolder);
                            string filePath = Path.Combine(locFolder, "user_data.json");
                            File.WriteAllText(filePath, jsonPayload, Encoding.UTF8);
                        }
                        catch { }
                    });
                }
                else if (msg == "load-user-data")
                {
                    Task.Run(() =>
                    {
                        try
                        {
                            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                            string filePath = Path.Combine(appData, "LeagueOfCustoms", "user_data.json");
                            string json = File.Exists(filePath) ? File.ReadAllText(filePath, Encoding.UTF8) : "{}";
                            var resDict = new Dictionary<string, object>
                            {
                                { "userDataType", "user-data-loaded" },
                                { "data", json }
                            };
                            var ser = new JavaScriptSerializer();
                            string responseMsg = ser.Serialize(resDict);
                            this.Invoke((Action)delegate
                            {
                                try { _webView.CoreWebView2.PostWebMessageAsString(responseMsg); } catch { }
                            });
                        }
                        catch { }
                    });
                }
                                else if (msg == "sync-live-data" || msg.StartsWith("sync-live-data:"))
                {
                    Task.Run(() =>
                    {
                        try
                        {
                            string currentVer = "16.18.1";
                            if (msg.StartsWith("sync-live-data:"))
                            {
                                currentVer = msg.Substring("sync-live-data:".Length).Trim();
                            }

                            // 1. Fetch latest patch version directly via .NET HttpWebRequest (no CORS)
                            HttpWebRequest req = (HttpWebRequest)WebRequest.Create("https://ddragon.leagueoflegends.com/api/versions.json");
                            req.Method = "GET";
                            req.UserAgent = "LeagueOfCustoms/0.5";
                            req.Timeout = 6000;
                            req.Proxy = null;
                            string versionsText = "";
                            using (var resp = (HttpWebResponse)req.GetResponse())
                            using (var stream = resp.GetResponseStream())
                            using (var sr = new StreamReader(stream, Encoding.UTF8))
                            {
                                versionsText = sr.ReadToEnd();
                            }

                            var ser = new JavaScriptSerializer();
                            ser.MaxJsonLength = 20971520;
                            var versions = ser.Deserialize<object[]>(versionsText);
                            string latestPatch = (versions != null && versions.Length > 0) ? versions[0].ToString() : currentVer;

                            var result = new Dictionary<string, object>
                            {
                                { "syncType", "live-data-sync" },
                                { "success", true },
                                { "latestPatch", latestPatch },
                                { "patchChanged", latestPatch != currentVer }
                            };

                            // Ensure live item catalog is always verified: check disk cache or fetch fresh from Riot
                            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                            string cacheFolder = Path.Combine(localAppData, "LeagueOfCustoms");
                            if (!Directory.Exists(cacheFolder)) Directory.CreateDirectory(cacheFolder);
                            string cacheFile = Path.Combine(cacheFolder, "items_" + latestPatch + ".json");

                            if (!File.Exists(cacheFile) || latestPatch != currentVer)
                            {
                                try
                                {
                                    HttpWebRequest itemReq = (HttpWebRequest)WebRequest.Create("https://ddragon.leagueoflegends.com/cdn/" + latestPatch + "/data/en_US/item.json");
                                    itemReq.Method = "GET";
                                    itemReq.UserAgent = "LeagueOfCustoms/0.5";
                                    itemReq.Timeout = 7000;
                                    itemReq.Proxy = null;
                                    string itemsText = "";
                                    using (var iResp = (HttpWebResponse)itemReq.GetResponse())
                                    using (var iStream = iResp.GetResponseStream())
                                    using (var iSr = new StreamReader(iStream, Encoding.UTF8))
                                    {
                                        itemsText = iSr.ReadToEnd();
                                    }
                                    try { File.WriteAllText(cacheFile, itemsText, Encoding.UTF8); } catch { }
                                    var itemDict = ser.Deserialize<Dictionary<string, object>>(itemsText);
                                    if (itemDict != null && itemDict.ContainsKey("data"))
                                    {
                                        result["itemsData"] = itemDict["data"];
                                    }
                                }
                                catch { }
                            }
                            else if (File.Exists(cacheFile))
                            {
                                try
                                {
                                    string itemsText = File.ReadAllText(cacheFile, Encoding.UTF8);
                                    var itemDict = ser.Deserialize<Dictionary<string, object>>(itemsText);
                                    if (itemDict != null && itemDict.ContainsKey("data"))
                                    {
                                        result["itemsData"] = itemDict["data"];
                                    }
                                }
                                catch { }
                            }

                            string jsonRes = ser.Serialize(result);
                            this.Invoke((Action)delegate
                            {
                                try { _webView.CoreWebView2.PostWebMessageAsString(jsonRes); } catch { }
                            });
                        }
                        catch (Exception ex)
                        {
                            var ser = new JavaScriptSerializer();
                            string errJson = ser.Serialize(new Dictionary<string, object>
                            {
                                { "syncType", "live-data-sync" },
                                { "success", false },
                                { "error", ex.Message }
                            });
                            this.Invoke((Action)delegate
                            {
                                try { _webView.CoreWebView2.PostWebMessageAsString(errJson); } catch { }
                            });
                        }
                    });
                }
                else if (msg == "check-auto-update" || msg == "check-github-update")
                {
                    Task.Run(() =>
                    {
                        try
                        {
                            HttpWebRequest req = (HttpWebRequest)WebRequest.Create("https://api.github.com/repos/Venomasa/League-of-Customs/releases/latest");
                            req.Method = "GET";
                            req.UserAgent = "LeagueOfCustoms/0.5";
                            req.Timeout = 10000;
                            req.Proxy = null;
                            string respText = "";
                            using (var resp = (HttpWebResponse)req.GetResponse())
                            using (var stream = resp.GetResponseStream())
                            using (var sr = new StreamReader(stream, Encoding.UTF8))
                            {
                                respText = sr.ReadToEnd();
                            }
                            var ser = new JavaScriptSerializer();
                            var dict = ser.Deserialize<Dictionary<string, object>>(respText);
                            string tagName = dict.ContainsKey("tag_name") ? dict["tag_name"].ToString() : "";
                            string currentAppVersion = "v0.5";

                            bool hasNewer = IsNewerVersion(tagName, currentAppVersion);
                            if (!hasNewer)
                            {
                                var upToDateRes = new Dictionary<string, object>
                                {
                                    { "autoUpdate", false },
                                    { "status", "up-to-date" },
                                    { "currentVersion", currentAppVersion },
                                    { "latestTag", tagName }
                                };
                                string json = ser.Serialize(upToDateRes);
                                this.Invoke((Action)delegate
                                {
                                    try { _webView.CoreWebView2.PostWebMessageAsString(json); } catch { }
                                });
                                return;
                            }

                            // A newer version is available! Find the installer (.exe) asset
                            string downloadUrl = "";
                            string assetName = "";
                            long assetSize = 0;

                            if (dict.ContainsKey("assets") && dict["assets"] is System.Collections.IEnumerable)
                            {
                                var assetsList = (System.Collections.IEnumerable)dict["assets"];
                                foreach (var item in assetsList)
                                {
                                    var assetDict = item as Dictionary<string, object>;
                                    if (assetDict != null)
                                    {
                                        string name = assetDict.ContainsKey("name") ? assetDict["name"].ToString() : "";
                                        if (name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                                        {
                                            assetName = name;
                                            downloadUrl = assetDict.ContainsKey("browser_download_url") ? assetDict["browser_download_url"].ToString() : "";
                                            if (assetDict.ContainsKey("size")) long.TryParse(assetDict["size"].ToString(), out assetSize);
                                            break;
                                        }
                                    }
                                }
                            }

                            if (string.IsNullOrEmpty(downloadUrl))
                            {
                                var noExeRes = new Dictionary<string, object>
                                {
                                    { "autoUpdate", false },
                                    { "status", "no-installer-asset" },
                                    { "latestTag", tagName }
                                };
                                string json = ser.Serialize(noExeRes);
                                this.Invoke((Action)delegate
                                {
                                    try { _webView.CoreWebView2.PostWebMessageAsString(json); } catch { }
                                });
                                return;
                            }

                            // Post "found" event to WebView
                            var foundRes = new Dictionary<string, object>
                            {
                                { "autoUpdate", true },
                                { "status", "found" },
                                { "version", tagName },
                                { "assetName", assetName },
                                { "size", assetSize }
                            };
                            string foundJson = ser.Serialize(foundRes);
                            this.Invoke((Action)delegate
                            {
                                try { _webView.CoreWebView2.PostWebMessageAsString(foundJson); } catch { }
                            });

                            // Begin streaming download to temp file
                            string tempSetupPath = Path.Combine(Path.GetTempPath(), "LoC_Update_" + tagName + "_" + (string.IsNullOrEmpty(assetName) ? "Setup.exe" : assetName));
                            using (var wc = new WebClient())
                            {
                                wc.Headers.Add("User-Agent", "LeagueOfCustoms/0.5");
                                wc.DownloadProgressChanged += (s, ev) =>
                                {
                                    var progRes = new Dictionary<string, object>
                                    {
                                        { "autoUpdate", true },
                                        { "status", "downloading" },
                                        { "version", tagName },
                                        { "progress", ev.ProgressPercentage },
                                        { "bytesReceived", ev.BytesReceived },
                                        { "totalBytes", ev.TotalBytesToReceive }
                                    };
                                    string progJson = ser.Serialize(progRes);
                                    this.Invoke((Action)delegate
                                    {
                                        try { _webView.CoreWebView2.PostWebMessageAsString(progJson); } catch { }
                                    });
                                };

                                wc.DownloadFileCompleted += (s, ev) =>
                                {
                                    if (ev.Error != null)
                                    {
                                        var errRes = new Dictionary<string, object>
                                        {
                                            { "autoUpdate", false },
                                            { "status", "error" },
                                            { "error", ev.Error.Message }
                                        };
                                        string errJson = ser.Serialize(errRes);
                                        this.Invoke((Action)delegate
                                        {
                                            try { _webView.CoreWebView2.PostWebMessageAsString(errJson); } catch { }
                                        });
                                        return;
                                    }

                                    // Successfully downloaded!
                                    var readyRes = new Dictionary<string, object>
                                    {
                                        { "autoUpdate", true },
                                        { "status", "installing" },
                                        { "version", tagName }
                                    };
                                    string readyJson = ser.Serialize(readyRes);
                                    this.Invoke((Action)delegate
                                    {
                                        try { _webView.CoreWebView2.PostWebMessageAsString(readyJson); } catch { }
                                    });

                                    // Launch downloaded setup in silent mode, pointing to current application base directory
                                    try
                                    {
                                        string currentDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
                                        string args = string.Format("/SILENT /DIR=\"{0}\"", currentDir);
                                        Process.Start(new ProcessStartInfo
                                        {
                                            FileName = tempSetupPath,
                                            Arguments = args,
                                            UseShellExecute = true
                                        });

                                        Thread.Sleep(500);
                                        Application.Exit();
                                    }
                                    catch (Exception launchEx)
                                    {
                                        var lErrRes = new Dictionary<string, object>
                                        {
                                            { "autoUpdate", false },
                                            { "status", "error" },
                                            { "error", "Failed to launch installer: " + launchEx.Message }
                                        };
                                        string lErrJson = ser.Serialize(lErrRes);
                                        this.Invoke((Action)delegate
                                        {
                                            try { _webView.CoreWebView2.PostWebMessageAsString(lErrJson); } catch { }
                                        });
                                    }
                                };

                                wc.DownloadFileAsync(new Uri(downloadUrl), tempSetupPath);
                            }
                        }
                        catch (Exception ex)
                        {
                            var ser = new JavaScriptSerializer();
                            string jsonRes = ser.Serialize(new Dictionary<string, object>
                            {
                                { "autoUpdate", false },
                                { "status", "error" },
                                { "error", ex.Message }
                            });
                            this.Invoke((Action)delegate
                            {
                                try { _webView.CoreWebView2.PostWebMessageAsString(jsonRes); } catch { }
                            });
                        }
                    });
                }
                else if (msg.StartsWith("get-profile:"))
                {
                    string paramStr = msg.Substring("get-profile:".Length);
                    Task.Run(() =>
                    {
                        string json = FetchOpggProfileJson(paramStr);
                        this.Invoke((Action)delegate
                        {
                            try
                            {
                                _webView.CoreWebView2.PostWebMessageAsString(json);
                            }
                            catch { }
                        });
                    });
                }
                else if (msg.StartsWith("get-mastery:"))
                {
                    string paramStr = msg.Substring("get-mastery:".Length);
                    Task.Run(() =>
                    {
                        string json = FetchMasteryJson(paramStr);
                        this.Invoke((Action)delegate
                        {
                            try
                            {
                                _webView.CoreWebView2.PostWebMessageAsString(json);
                            }
                            catch { }
                        });
                    });
                }
                else if (msg.StartsWith("get-game-detail:"))
                {
                    string paramStr = msg.Substring("get-game-detail:".Length);
                    Task.Run(() =>
                    {
                        string json = FetchGameDetailJson(paramStr);
                        this.Invoke((Action)delegate
                        {
                            try
                            {
                                _webView.CoreWebView2.PostWebMessageAsString(json);
                            }
                            catch { }
                        });
                    });
                }
                else if (msg.StartsWith("get-more-matches:"))
                {
                    string paramStr = msg.Substring("get-more-matches:".Length);
                    Task.Run(() =>
                    {
                        string json = FetchMoreMatchesJson(paramStr);
                        this.Invoke((Action)delegate
                        {
                            try
                            {
                                _webView.CoreWebView2.PostWebMessageAsString(json);
                            }
                            catch { }
                        });
                    });
                }
                else if (msg.StartsWith("inject-solo-loadout:"))
                {
                    string payloadJson = msg.Substring("inject-solo-loadout:".Length);
                    Task.Run(() =>
                    {
                        string json = InjectSoloLoadoutJson(payloadJson);
                        this.Invoke((Action)delegate
                        {
                            try
                            {
                                _webView.CoreWebView2.PostWebMessageAsString(json);
                            }
                            catch { }
                        });
                    });
                }
                else if (msg == "get-lobby")
                {
                    Task.Run(() =>
                    {
                        string json = GetLobbyMembersJson();
                        this.Invoke((Action)delegate
                        {
                            try
                            {
                                _webView.CoreWebView2.PostWebMessageAsString(json);
                            }
                            catch { }
                        });
                    });
                }
                else if (msg == "get-patch-notes-list" || msg.StartsWith("get-patch-notes-list"))
                {
                    Task.Run(() =>
                    {
                        string json = FetchPatchNotesListJson();
                        this.Invoke((Action)delegate
                        {
                            try
                            {
                                _webView.CoreWebView2.PostWebMessageAsString(json);
                            }
                            catch { }
                        });
                    });
                }
                else if (msg.StartsWith("get-patch-detail:"))
                {
                    string articleUrl = msg.Substring("get-patch-detail:".Length);
                    Task.Run(() =>
                    {
                        string json = FetchPatchDetailJson(articleUrl);
                        this.Invoke((Action)delegate
                        {
                            try
                            {
                                _webView.CoreWebView2.PostWebMessageAsString(json);
                            }
                            catch { }
                        });
                    });
                }
            }
            catch { }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            _isRunning = false;
            try
            {
                if (_fallbackListener != null && _fallbackListener.IsListening)
                {
                    _fallbackListener.Stop();
                    _fallbackListener.Close();
                }
            }
            catch { }
            base.OnFormClosing(e);
        }

        private void StartFallbackHttpServer()
        {
            try
            {
                _fallbackListener = new HttpListener();
                _fallbackListener.Prefixes.Add("http://127.0.0.1:9137/");
                _fallbackListener.Start();

                ThreadPool.QueueUserWorkItem(delegate
                {
                    while (_isRunning && _fallbackListener != null && _fallbackListener.IsListening)
                    {
                        try
                        {
                            var ctx = _fallbackListener.GetContext();
                            ThreadPool.QueueUserWorkItem(ProcessFallbackRequest, ctx);
                        }
                        catch
                        {
                            if (!_isRunning) break;
                        }
                    }
                });
            }
            catch { }
        }

        private void ProcessFallbackRequest(object state)
        {
            HttpListenerContext ctx = (HttpListenerContext)state;
            try
            {
                var req = ctx.Request;
                var res = ctx.Response;

                res.Headers.Add("Access-Control-Allow-Origin", "*");
                res.Headers.Add("Access-Control-Allow-Methods", "GET, OPTIONS, POST");
                res.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

                if (req.HttpMethod == "OPTIONS")
                {
                    res.StatusCode = 204;
                    res.Close();
                    return;
                }

                string path = req.Url.AbsolutePath.ToLowerInvariant();

                if (path == "/lobby-members")
                {
                    string json = GetLobbyMembersJson();
                    byte[] buf = Encoding.UTF8.GetBytes(json);
                    res.ContentType = "application/json; charset=utf-8";
                    res.ContentLength64 = buf.Length;
                    res.OutputStream.Write(buf, 0, buf.Length);
                    res.Close();
                    return;
                }

                if (path == "/inject-solo-loadout")
                {
                    string reqBody = "";
                    using (var rdr = new StreamReader(req.InputStream, req.ContentEncoding))
                    {
                        reqBody = rdr.ReadToEnd();
                    }
                    string json = InjectSoloLoadoutJson(reqBody);
                    byte[] buf = Encoding.UTF8.GetBytes(json);
                    res.ContentType = "application/json; charset=utf-8";
                    res.ContentLength64 = buf.Length;
                    res.OutputStream.Write(buf, 0, buf.Length);
                    res.Close();
                    return;
                }

                // Serve index.html if requested
                byte[] html = GetHtmlBytes();
                res.ContentType = "text/html; charset=utf-8";
                res.ContentLength64 = html.Length;
                res.OutputStream.Write(html, 0, html.Length);
                res.Close();
            }
            catch { }
        }

        private byte[] GetHtmlBytes()
        {
            string localPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "index.html");
            if (File.Exists(localPath))
            {
                try { return File.ReadAllBytes(localPath); } catch { }
            }
            return _embeddedHtml != null ? _embeddedHtml : Encoding.UTF8.GetBytes("<html><body>index.html not found</body></html>");
        }

        private void LoadEmbeddedHtml()
        {
            try
            {
                var asm = Assembly.GetExecutingAssembly();
                using (Stream s = asm.GetManifestResourceStream("index.html"))
                {
                    if (s != null)
                    {
                        using (MemoryStream ms = new MemoryStream())
                        {
                            s.CopyTo(ms);
                            _embeddedHtml = ms.ToArray();
                        }
                    }
                }
            }
            catch { }
        }

        public static string GetLobbyMembersJson()
        {
            var serializer = new JavaScriptSerializer();
            try
            {
                string lockfile = FindLockfile();
                if (string.IsNullOrEmpty(lockfile))
                {
                    return serializer.Serialize(new { error = "League Client lockfile not found. Make sure League is running and you are logged in." });
                }

                // Read lockfile with ReadWrite sharing — League Client holds it open
                string lockContent;
                using (var fs = new FileStream(lockfile, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                using (var sr = new StreamReader(fs, Encoding.UTF8))
                {
                    lockContent = sr.ReadToEnd();
                }

                // Format: name:pid:port:password:protocol
                // Split with limit 5 so any colons inside the password don't shift indices
                string[] parts = lockContent.Split(new char[]{':'}, 5);
                if (parts.Length < 5)
                {
                    return serializer.Serialize(new { error = "Invalid lockfile format." });
                }

                int lcuPort = int.Parse(parts[2].Trim());
                // Trim trailing whitespace/newlines that ReadToEnd can leave on the last field
                string lcuPass = parts[3].Trim();

                string uri = "https://127.0.0.1:" + lcuPort + "/lol-lobby/v2/lobby";
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(uri);
                req.Method = "GET";
                string auth = Convert.ToBase64String(Encoding.ASCII.GetBytes("riot:" + lcuPass));
                req.Headers["Authorization"] = "Basic " + auth;
                req.ServerCertificateValidationCallback = delegate { return true; };
                req.Timeout = 4000;

                using (var resp = (HttpWebResponse)req.GetResponse())
                using (var reader = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
                {
                    string body = reader.ReadToEnd();
                    var dict = serializer.Deserialize<Dictionary<string, object>>(body);
                    var members = new List<string>();

                    if (dict.ContainsKey("members") && dict["members"] is System.Collections.ArrayList)
                    {
                        var list = (System.Collections.ArrayList)dict["members"];
                        foreach (object item in list)
                        {
                            if (!(item is Dictionary<string, object>)) continue;
                            var m = (Dictionary<string, object>)item;

                            // Step 1: try fields the LCU puts directly on the member (older clients)
                            string displayName = ResolveMemberName(m);

                            // Step 2: if still unknown, call /lol-summoner/v1/summoners/{id}
                            //         The modern LCU moved identity fields off the lobby member object
                            if (displayName == null)
                            {
                                string sid = m.ContainsKey("summonerId") && m["summonerId"] != null ? m["summonerId"].ToString() : "";
                                string puid = m.ContainsKey("puuid") && m["puuid"] != null ? m["puuid"].ToString() : "";

                                if (!string.IsNullOrEmpty(sid) && sid != "0")
                                    displayName = FetchSummonerName("https://127.0.0.1:" + lcuPort + "/lol-summoner/v1/summoners/" + sid, auth, serializer);

                                if (displayName == null && !string.IsNullOrEmpty(puid))
                                    displayName = FetchSummonerName("https://127.0.0.1:" + lcuPort + "/lol-summoner/v2/summoners/puuid/" + puid, auth, serializer);
                            }

                            members.Add(displayName ?? "Unknown");
                        }
                    }

                    return serializer.Serialize(new { players = members, count = members.Count });
                }
            }
            catch (WebException wex)
            {
                HttpWebResponse hResp = wex.Response as HttpWebResponse;
                if (hResp != null && hResp.StatusCode == HttpStatusCode.NotFound)
                {
                    return serializer.Serialize(new { error = "Not in a lobby. Open or create a custom game lobby in the LoL client first." });
                }
                return serializer.Serialize(new { error = "LCU API error: " + wex.Message });
            }
            catch (Exception ex)
            {
                return serializer.Serialize(new { error = "LCU error: " + ex.Message });
            }
        }

        // Try all known name fields that different LCU versions put directly on a lobby member object.
        // Returns null if none found (caller should then query the summoner endpoint).
        private static string ResolveMemberName(Dictionary<string, object> m)
        {
            string[] nameFields = new[] { "summonerName", "gameName", "riotIdGameName", "displayName", "name" };
            string[] tagFields  = new[] { "tagLine", "riotIdTagLine", "gameTag" };

            foreach (string nf in nameFields)
            {
                if (!m.ContainsKey(nf) || m[nf] == null) continue;
                string name = m[nf].ToString().Trim();
                if (string.IsNullOrEmpty(name)) continue;

                // Try to find a matching tag
                string tag = "";
                foreach (string tf in tagFields)
                {
                    if (m.ContainsKey(tf) && m[tf] != null)
                    {
                        tag = m[tf].ToString().Trim();
                        if (!string.IsNullOrEmpty(tag)) break;
                    }
                }
                return string.IsNullOrEmpty(tag) ? name : (name + " #" + tag);
            }
            return null;
        }

        // Calls a LCU summoner endpoint and extracts gameName+tagLine (or displayName / summonerName).
        private static string FetchSummonerName(string url, string authHeader, JavaScriptSerializer serializer)
        {
            try
            {
                HttpWebRequest r = (HttpWebRequest)WebRequest.Create(url);
                r.Method = "GET";
                r.Headers["Authorization"] = "Basic " + authHeader;
                r.ServerCertificateValidationCallback = delegate { return true; };
                r.Timeout = 3000;
                using (var resp = (HttpWebResponse)r.GetResponse())
                using (var sr = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
                {
                    var d = serializer.Deserialize<Dictionary<string, object>>(sr.ReadToEnd());
                    // Prefer gameName+tagLine, fall back to displayName / summonerName
                    string gName = d.ContainsKey("gameName")     && d["gameName"]     != null ? d["gameName"].ToString().Trim()     : "";
                    string tag   = d.ContainsKey("tagLine")      && d["tagLine"]      != null ? d["tagLine"].ToString().Trim()      : "";
                    if (!string.IsNullOrEmpty(gName))
                        return string.IsNullOrEmpty(tag) ? gName : (gName + " #" + tag);

                    string disp = d.ContainsKey("displayName")   && d["displayName"]  != null ? d["displayName"].ToString().Trim()  : "";
                    if (!string.IsNullOrEmpty(disp)) return disp;

                    string sName = d.ContainsKey("summonerName") && d["summonerName"] != null ? d["summonerName"].ToString().Trim() : "";
                    if (!string.IsNullOrEmpty(sName)) return sName;
                }
            }
            catch { }
            return null;
        }

        // P/Invoke: QueryFullProcessImageName works with PROCESS_QUERY_LIMITED_INFORMATION
        // which does NOT require admin rights, unlike MainModule.FileName
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, int dwProcessId);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool QueryFullProcessImageName(IntPtr hProcess, int dwFlags, StringBuilder lpExeName, ref int lpdwSize);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr hObject);

        private const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

        private static string GetProcessPath(int pid)
        {
            IntPtr handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
            if (handle == IntPtr.Zero) return null;
            try
            {
                var sb = new StringBuilder(1024);
                int size = sb.Capacity;
                return QueryFullProcessImageName(handle, 0, sb, ref size) ? sb.ToString() : null;
            }
            finally { CloseHandle(handle); }
        }

        public static string LcuRequest(int port, string password, string method, string endpoint, string jsonBody = null)
        {
            try
            {
                string uri = "https://127.0.0.1:" + port + endpoint;
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(uri);
                req.Method = method;
                string auth = Convert.ToBase64String(Encoding.ASCII.GetBytes("riot:" + password));
                req.Headers["Authorization"] = "Basic " + auth;
                req.ServerCertificateValidationCallback = delegate { return true; };
                req.Timeout = 4000;

                if (!string.IsNullOrEmpty(jsonBody) && (method == "POST" || method == "PUT" || method == "PATCH"))
                {
                    req.ContentType = "application/json";
                    byte[] bytes = Encoding.UTF8.GetBytes(jsonBody);
                    req.ContentLength = bytes.Length;
                    using (var stream = req.GetRequestStream())
                    {
                        stream.Write(bytes, 0, bytes.Length);
                    }
                }

                using (var resp = (HttpWebResponse)req.GetResponse())
                using (var reader = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
                {
                    return reader.ReadToEnd();
                }
            }
            catch (WebException wex)
            {
                if (wex.Response != null)
                {
                    using (var reader = new StreamReader(wex.Response.GetResponseStream(), Encoding.UTF8))
                    {
                        return "ERROR:" + ((HttpWebResponse)wex.Response).StatusCode + ":" + reader.ReadToEnd();
                    }
                }
                return "ERROR:" + wex.Message;
            }
            catch (Exception ex)
            {
                return "ERROR:" + ex.Message;
            }
        }

private static readonly Dictionary<string, int> _championNumericMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            { "aatrox", 266 },
            { "ahri", 103 },
            { "akali", 84 },
            { "akshan", 166 },
            { "alistar", 12 },
            { "ambessa", 799 },
            { "amumu", 32 },
            { "anivia", 34 },
            { "annie", 1 },
            { "aphelios", 523 },
            { "ashe", 22 },
            { "aurelion sol", 136 },
            { "aurelionsol", 136 },
            { "aurora", 893 },
            { "azir", 268 },
            { "bard", 432 },
            { "bel'veth", 200 },
            { "belveth", 200 },
            { "blitzcrank", 53 },
            { "brand", 63 },
            { "braum", 201 },
            { "briar", 233 },
            { "caitlyn", 51 },
            { "camille", 164 },
            { "cassiopeia", 69 },
            { "cho'gath", 31 },
            { "chogath", 31 },
            { "corki", 42 },
            { "darius", 122 },
            { "diana", 131 },
            { "dr. mundo", 36 },
            { "draven", 119 },
            { "drmundo", 36 },
            { "ekko", 245 },
            { "elise", 60 },
            { "evelynn", 28 },
            { "ezreal", 81 },
            { "fiddlesticks", 9 },
            { "fiora", 114 },
            { "fizz", 105 },
            { "galio", 3 },
            { "gangplank", 41 },
            { "garen", 86 },
            { "gnar", 150 },
            { "gragas", 79 },
            { "graves", 104 },
            { "gwen", 887 },
            { "hecarim", 120 },
            { "heimerdinger", 74 },
            { "hwei", 910 },
            { "illaoi", 420 },
            { "irelia", 39 },
            { "ivern", 427 },
            { "janna", 40 },
            { "jarvan iv", 59 },
            { "jarvaniv", 59 },
            { "jax", 24 },
            { "jayce", 126 },
            { "jhin", 202 },
            { "jinx", 222 },
            { "k'sante", 897 },
            { "kai'sa", 145 },
            { "kaisa", 145 },
            { "kalista", 429 },
            { "karma", 43 },
            { "karthus", 30 },
            { "kassadin", 38 },
            { "katarina", 55 },
            { "kayle", 10 },
            { "kayn", 141 },
            { "kennen", 85 },
            { "kha'zix", 121 },
            { "khazix", 121 },
            { "kindred", 203 },
            { "kled", 240 },
            { "kog'maw", 96 },
            { "kogmaw", 96 },
            { "ksante", 897 },
            { "leblanc", 7 },
            { "lee sin", 64 },
            { "leesin", 64 },
            { "leona", 89 },
            { "lillia", 876 },
            { "lissandra", 127 },
            { "locke", 805 },
            { "lucian", 236 },
            { "lulu", 117 },
            { "lux", 99 },
            { "malphite", 54 },
            { "malzahar", 90 },
            { "maokai", 57 },
            { "master yi", 11 },
            { "masteryi", 11 },
            { "mel", 800 },
            { "milio", 902 },
            { "miss fortune", 21 },
            { "missfortune", 21 },
            { "monkeyking", 62 },
            { "mordekaiser", 82 },
            { "morgana", 25 },
            { "naafiri", 950 },
            { "nami", 267 },
            { "nasus", 75 },
            { "nautilus", 111 },
            { "neeko", 518 },
            { "nidalee", 76 },
            { "nilah", 895 },
            { "nocturne", 56 },
            { "nunu", 20 },
            { "nunu & willump", 20 },
            { "olaf", 2 },
            { "orianna", 61 },
            { "ornn", 516 },
            { "pantheon", 80 },
            { "poppy", 78 },
            { "pyke", 555 },
            { "qiyana", 246 },
            { "quinn", 133 },
            { "rakan", 497 },
            { "rammus", 33 },
            { "rek'sai", 421 },
            { "reksai", 421 },
            { "rell", 526 },
            { "renata", 888 },
            { "renata glasc", 888 },
            { "renekton", 58 },
            { "rengar", 107 },
            { "riven", 92 },
            { "rumble", 68 },
            { "ryze", 13 },
            { "samira", 360 },
            { "sejuani", 113 },
            { "senna", 235 },
            { "seraphine", 147 },
            { "sett", 875 },
            { "shaco", 35 },
            { "shen", 98 },
            { "shyvana", 102 },
            { "singed", 27 },
            { "sion", 14 },
            { "sivir", 15 },
            { "skarner", 72 },
            { "smolder", 901 },
            { "sona", 37 },
            { "soraka", 16 },
            { "swain", 50 },
            { "sylas", 517 },
            { "syndra", 134 },
            { "tahm kench", 223 },
            { "tahmkench", 223 },
            { "taliyah", 163 },
            { "talon", 91 },
            { "taric", 44 },
            { "teemo", 17 },
            { "thresh", 412 },
            { "tristana", 18 },
            { "trundle", 48 },
            { "tryndamere", 23 },
            { "twisted fate", 4 },
            { "twistedfate", 4 },
            { "twitch", 29 },
            { "udyr", 77 },
            { "urgot", 6 },
            { "varus", 110 },
            { "vayne", 67 },
            { "veigar", 45 },
            { "vel'koz", 161 },
            { "velkoz", 161 },
            { "vex", 711 },
            { "vi", 254 },
            { "viego", 234 },
            { "viktor", 112 },
            { "vladimir", 8 },
            { "volibear", 106 },
            { "warwick", 19 },
            { "wukong", 62 },
            { "xayah", 498 },
            { "xerath", 101 },
            { "xin zhao", 5 },
            { "xinzhao", 5 },
            { "yasuo", 157 },
            { "yone", 777 },
            { "yorick", 83 },
            { "yunara", 804 },
            { "yuumi", 350 },
            { "zaahen", 904 },
            { "zac", 154 },
            { "zed", 238 },
            { "zeri", 221 },
            { "ziggs", 115 },
            { "zilean", 26 },
            { "zoe", 142 },
            { "zyra", 143 },
        };

        public static string InjectSoloLoadoutJson(string jsonPayload)
        {
            var serializer = new JavaScriptSerializer();
            try
            {
                string lockfile = FindLockfile();
                if (string.IsNullOrEmpty(lockfile))
                {
                    return serializer.Serialize(new
                    {
                        injectType = "solo-loadout",
                        success = false,
                        error = "League Client lockfile not found. Make sure League of Legends is running and you are logged in."
                    });
                }

                string lockContent;
                using (var fs = new FileStream(lockfile, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                using (var sr = new StreamReader(fs, Encoding.UTF8))
                {
                    lockContent = sr.ReadToEnd();
                }

                string[] parts = lockContent.Split(new char[] { ':' }, 5);
                if (parts.Length < 5)
                {
                    return serializer.Serialize(new
                    {
                        injectType = "solo-loadout",
                        success = false,
                        error = "Invalid League Client lockfile format."
                    });
                }

                int lcuPort = int.Parse(parts[2].Trim());
                string lcuPass = parts[3].Trim();

                var payload = serializer.Deserialize<Dictionary<string, object>>(jsonPayload);
                if (payload == null)
                {
                    return serializer.Serialize(new
                    {
                        injectType = "solo-loadout",
                        success = false,
                        error = "Empty or invalid loadout payload."
                    });
                }

                string champName = payload.ContainsKey("championName") ? payload["championName"].ToString() : "Champion";
                int primaryTreeId = payload.ContainsKey("primaryTreeId") ? Convert.ToInt32(payload["primaryTreeId"]) : 8100;
                int secondaryTreeId = payload.ContainsKey("secondaryTreeId") ? Convert.ToInt32(payload["secondaryTreeId"]) : 8200;

                var selectedPerkIds = new List<int>();
                if (payload.ContainsKey("selectedPerkIds") && payload["selectedPerkIds"] is System.Collections.ArrayList)
                {
                    foreach (var p in (System.Collections.ArrayList)payload["selectedPerkIds"])
                    {
                        selectedPerkIds.Add(Convert.ToInt32(p));
                    }
                }

                int starterId = payload.ContainsKey("starterId") ? Convert.ToInt32(payload["starterId"]) : 0;
                int bootsId = payload.ContainsKey("bootsId") ? Convert.ToInt32(payload["bootsId"]) : 0;
                var coreItemIds = new List<int>();
                if (payload.ContainsKey("coreItemIds") && payload["coreItemIds"] is System.Collections.ArrayList)
                {
                    foreach (var it in (System.Collections.ArrayList)payload["coreItemIds"])
                    {
                        coreItemIds.Add(Convert.ToInt32(it));
                    }
                }

                int spell1Id = payload.ContainsKey("spell1Id") ? Convert.ToInt32(payload["spell1Id"]) : 0;
                int spell2Id = payload.ContainsKey("spell2Id") ? Convert.ToInt32(payload["spell2Id"]) : 0;
                int replacePageId = payload.ContainsKey("replacePageId") ? Convert.ToInt32(payload["replacePageId"]) : 0;

                int champNumericId = 0;
                if (payload.ContainsKey("championId"))
                {
                    int.TryParse(payload["championId"].ToString(), out champNumericId);
                }
                if (champNumericId <= 0 && _championNumericMap.ContainsKey(champName))
                {
                    champNumericId = _championNumericMap[champName];
                }

                // --- 1. RUNES (PERKS) INJECTION & SMART SINGLE-PAGE MANAGEMENT ---
                bool runesSuccess = false;
                string runePageName = "League of Customs: " + champName;
                string pagesJson = LcuRequest(lcuPort, lcuPass, "GET", "/lol-perks/v1/pages");
                
                if (!pagesJson.StartsWith("ERROR:"))
                {
                    var pages = serializer.Deserialize<object>(pagesJson) as System.Collections.ArrayList;
                    var locPageIds = new List<int>();
                    var deletablePagesList = new List<Dictionary<string, object>>();

                    if (pages != null)
                    {
                        foreach (var pObj in pages)
                        {
                            var pDict = pObj as Dictionary<string, object>;
                            if (pDict != null)
                            {
                                string pName = pDict.ContainsKey("name") ? pDict["name"].ToString() : "";
                                int pid = pDict.ContainsKey("id") ? Convert.ToInt32(pDict["id"]) : -1;
                                bool isDel = pDict.ContainsKey("isDeletable") && Convert.ToBoolean(pDict["isDeletable"]);

                                bool isLoc = pName.StartsWith("LoC", StringComparison.OrdinalIgnoreCase) || 
                                             pName.StartsWith("League of Customs", StringComparison.OrdinalIgnoreCase) ||
                                             pName.IndexOf("League of Customs", StringComparison.OrdinalIgnoreCase) >= 0;

                                if (isLoc)
                                {
                                    locPageIds.Add(pid);
                                }
                                else if (isDel)
                                {
                                    deletablePagesList.Add(new Dictionary<string, object>
                                    {
                                        { "id", pid },
                                        { "name", pName },
                                        { "primaryStyleId", pDict.ContainsKey("primaryStyleId") ? pDict["primaryStyleId"] : 0 },
                                        { "subStyleId", pDict.ContainsKey("subStyleId") ? pDict["subStyleId"] : 0 },
                                        { "current", pDict.ContainsKey("current") && Convert.ToBoolean(pDict["current"]) },
                                        { "isActive", pDict.ContainsKey("isActive") && Convert.ToBoolean(pDict["isActive"]) }
                                    });
                                }
                            }
                        }
                    }

                    var perkPagePayload = new Dictionary<string, object>
                    {
                        { "name", runePageName },
                        { "primaryStyleId", primaryTreeId },
                        { "subStyleId", secondaryTreeId },
                        { "selectedPerkIds", selectedPerkIds },
                        { "current", true }
                    };
                    string perkJsonBody = serializer.Serialize(perkPagePayload);

                    int targetPageId = -1;

                    // Case A: User explicitly picked a page to replace from the modal
                    if (replacePageId > 0)
                    {
                        string putRes = LcuRequest(lcuPort, lcuPass, "PUT", "/lol-perks/v1/pages/" + replacePageId, perkJsonBody);
                        if (!putRes.StartsWith("ERROR:"))
                        {
                            targetPageId = replacePageId;
                            runesSuccess = true;
                        }
                        else
                        {
                            LcuRequest(lcuPort, lcuPass, "DELETE", "/lol-perks/v1/pages/" + replacePageId);
                            string postRes = LcuRequest(lcuPort, lcuPass, "POST", "/lol-perks/v1/pages", perkJsonBody);
                            if (!postRes.StartsWith("ERROR:"))
                            {
                                var postObj = serializer.Deserialize<Dictionary<string, object>>(postRes);
                                if (postObj != null && postObj.ContainsKey("id"))
                                {
                                    targetPageId = Convert.ToInt32(postObj["id"]);
                                }
                                runesSuccess = true;
                            }
                        }

                        // Clean up any other leftover LoC pages
                        for (int i = 0; i < locPageIds.Count; i++)
                        {
                            if (locPageIds[i] != targetPageId && locPageIds[i] != replacePageId)
                            {
                                try { LcuRequest(lcuPort, lcuPass, "DELETE", "/lol-perks/v1/pages/" + locPageIds[i]); } catch { }
                            }
                        }
                    }
                    // Case B: Reusing existing LoC page (guarantees strictly ONE LoC page)
                    else if (locPageIds.Count > 0)
                    {
                        int mainLocId = locPageIds[0];
                        string putRes = LcuRequest(lcuPort, lcuPass, "PUT", "/lol-perks/v1/pages/" + mainLocId, perkJsonBody);
                        if (!putRes.StartsWith("ERROR:"))
                        {
                            targetPageId = mainLocId;
                            runesSuccess = true;
                        }
                        else
                        {
                            LcuRequest(lcuPort, lcuPass, "DELETE", "/lol-perks/v1/pages/" + mainLocId);
                            string postRes = LcuRequest(lcuPort, lcuPass, "POST", "/lol-perks/v1/pages", perkJsonBody);
                            if (!postRes.StartsWith("ERROR:"))
                            {
                                var postObj = serializer.Deserialize<Dictionary<string, object>>(postRes);
                                if (postObj != null && postObj.ContainsKey("id"))
                                {
                                    targetPageId = Convert.ToInt32(postObj["id"]);
                                }
                                runesSuccess = true;
                            }
                        }

                        // Clean up any extra duplicate LoC pages if any were created previously
                        for (int i = 1; i < locPageIds.Count; i++)
                        {
                            try { LcuRequest(lcuPort, lcuPass, "DELETE", "/lol-perks/v1/pages/" + locPageIds[i]); } catch { }
                        }
                    }
                    // Case C: No LoC page exists yet and no replacement chosen
                    else
                    {
                        bool canAdd = true;
                        try
                        {
                            string invJson = LcuRequest(lcuPort, lcuPass, "GET", "/lol-perks/v1/inventory");
                            if (!invJson.StartsWith("ERROR:"))
                            {
                                var invDict = serializer.Deserialize<Dictionary<string, object>>(invJson);
                                if (invDict != null && invDict.ContainsKey("canAddPages"))
                                {
                                    canAdd = Convert.ToBoolean(invDict["canAddPages"]);
                                }
                            }
                        }
                        catch { }

                        if (canAdd)
                        {
                            string postRes = LcuRequest(lcuPort, lcuPass, "POST", "/lol-perks/v1/pages", perkJsonBody);
                            if (!postRes.StartsWith("ERROR:"))
                            {
                                var postObj = serializer.Deserialize<Dictionary<string, object>>(postRes);
                                if (postObj != null && postObj.ContainsKey("id"))
                                {
                                    targetPageId = Convert.ToInt32(postObj["id"]);
                                }
                                runesSuccess = true;
                            }
                            else
                            {
                                canAdd = false;
                            }
                        }

                        if (!canAdd && !runesSuccess)
                        {
                            if (deletablePagesList.Count > 0)
                            {
                                return serializer.Serialize(new
                                {
                                    injectType = "solo-loadout",
                                    success = false,
                                    requiresPageSelection = true,
                                    championName = champName,
                                    pages = deletablePagesList,
                                    message = "All rune page slots are full. Choose an existing page to replace."
                                });
                            }
                            else
                            {
                                return serializer.Serialize(new
                                {
                                    injectType = "solo-loadout",
                                    success = false,
                                    error = "Rune pages are full and no custom pages could be found to replace."
                                });
                            }
                        }
                    }

                    // Force activate the injected rune page in the client
                    if (targetPageId > 0)
                    {
                        LcuRequest(lcuPort, lcuPass, "PUT", "/lol-perks/v1/currentpage", targetPageId.ToString());
                    }
                }

                // --- 2. BUILD (ITEM SET) INJECTION & SINGLE SET GUARANTEE ---
                bool itemSetSuccess = false;
                var starterAndBoots = new List<object>();
                if (starterId > 0) starterAndBoots.Add(new Dictionary<string, object> { { "id", starterId.ToString() }, { "count", 1 } });
                if (bootsId > 0) starterAndBoots.Add(new Dictionary<string, object> { { "id", bootsId.ToString() }, { "count", 1 } });

                var coreBuild = new List<object>();
                foreach (var itId in coreItemIds)
                {
                    if (itId > 0) coreBuild.Add(new Dictionary<string, object> { { "id", itId.ToString() }, { "count", 1 } });
                }

                // 2.A LCU API Item Set (Overwrites any previous LoC item set)
                try
                {
                    string curSummJson = LcuRequest(lcuPort, lcuPass, "GET", "/lol-summoner/v1/current-summoner");
                    if (!curSummJson.StartsWith("ERROR:"))
                    {
                        var summDict = serializer.Deserialize<Dictionary<string, object>>(curSummJson);
                        long summonerId = summDict.ContainsKey("summonerId") ? Convert.ToInt64(summDict["summonerId"]) : 0;
                        long accountId = summDict.ContainsKey("accountId") ? Convert.ToInt64(summDict["accountId"]) : 0;

                        if (summonerId > 0)
                        {
                            string setsJson = LcuRequest(lcuPort, lcuPass, "GET", "/lol-item-sets/v1/item-sets/" + summonerId + "/sets");
                            var setsObj = serializer.Deserialize<Dictionary<string, object>>(setsJson);
                            var itemSetsList = new List<object>();

                            if (setsObj != null && setsObj.ContainsKey("itemSets") && setsObj["itemSets"] is System.Collections.ArrayList)
                            {
                                var rawSets = (System.Collections.ArrayList)setsObj["itemSets"];
                                foreach (var setItem in rawSets)
                                {
                                    var setDict = setItem as Dictionary<string, object>;
                                    if (setDict != null)
                                    {
                                        string title = setDict.ContainsKey("title") ? setDict["title"].ToString() : "";
                                        if (!title.StartsWith("LoC") && !title.StartsWith("League of Customs"))
                                        {
                                            itemSetsList.Add(setDict);
                                        }
                                    }
                                }
                            }

                            var newLocSet = new Dictionary<string, object>
                            {
                                { "title", "League of Customs: " + champName },
                                { "type", "custom" },
                                { "map", "any" },
                                { "mode", "any" },
                                { "priority", true },
                                { "sortrank", 0 },
                                { "blocks", new List<object>
                                    {
                                        new Dictionary<string, object>
                                        {
                                            { "type", "Starter & Boots" },
                                            { "recMath", false },
                                            { "items", starterAndBoots }
                                        },
                                        new Dictionary<string, object>
                                        {
                                            { "type", "Randomized Core Build" },
                                            { "recMath", false },
                                            { "items", coreBuild }
                                        }
                                    }
                                }
                            };

                            itemSetsList.Add(newLocSet);

                            long nowUnix = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
                            var putSetsPayload = new Dictionary<string, object>
                            {
                                { "accountId", accountId },
                                { "itemSets", itemSetsList },
                                { "timestamp", nowUnix }
                            };

                            string putSetsRes = LcuRequest(lcuPort, lcuPass, "PUT", "/lol-item-sets/v1/item-sets/" + summonerId + "/sets", serializer.Serialize(putSetsPayload));
                            if (!putSetsRes.StartsWith("ERROR:"))
                            {
                                itemSetSuccess = true;
                            }
                            else
                            {
                                string postSetsRes = LcuRequest(lcuPort, lcuPass, "POST", "/lol-item-sets/v1/item-sets/" + summonerId + "/sets", serializer.Serialize(putSetsPayload));
                                if (!postSetsRes.StartsWith("ERROR:")) itemSetSuccess = true;
                            }
                        }
                    }
                }
                catch { }

                // 2.B Disk-based In-game Shop Config: Clean previous LoC files and write fresh
                try
                {
                    string leagueDir = Path.GetDirectoryName(lockfile);
                    string champsConfigDir = Path.Combine(leagueDir, "Config", "Champions");
                    if (Directory.Exists(champsConfigDir))
                    {
                        string[] oldLocFiles = Directory.GetFiles(champsConfigDir, "LoC*.json", SearchOption.AllDirectories);
                        foreach (var oldF in oldLocFiles)
                        {
                            try { File.Delete(oldF); } catch { }
                        }
                        string[] oldLocFiles2 = Directory.GetFiles(champsConfigDir, "LeagueOfCustoms*.json", SearchOption.AllDirectories);
                        foreach (var oldF in oldLocFiles2)
                        {
                            try { File.Delete(oldF); } catch { }
                        }

                        string champKey = champName;
                        if (champName == "Wukong") champKey = "MonkeyKing";
                        else if (champName == "Renata Glasc") champKey = "Renata";
                        else if (champName == "Nunu & Willump") champKey = "Nunu";
                        else if (champName == "Cho'Gath") champKey = "Chogath";
                        else if (champName == "Kai'Sa") champKey = "Kaisa";
                        else if (champName == "Kha'Zix") champKey = "Khazix";
                        else if (champName == "Kog'Maw") champKey = "KogMaw";
                        else if (champName == "LeBlanc") champKey = "Leblanc";
                        else if (champName == "Vel'Koz") champKey = "Velkoz";
                        else if (champName == "Bel'Veth") champKey = "Belveth";
                        else if (champName == "K'Sante") champKey = "KSante";

                        string champRecDir = Path.Combine(champsConfigDir, champKey, "Recommended");
                        Directory.CreateDirectory(champRecDir);
                        string newRecFilePath = Path.Combine(champRecDir, "LeagueOfCustoms.json");

                        var recPayload = new Dictionary<string, object>
                        {
                            { "title", "League of Customs: " + champName },
                            { "champion", champKey },
                            { "type", "custom" },
                            { "map", "any" },
                            { "mode", "any" },
                            { "priority", true },
                            { "blocks", new List<object>
                                {
                                    new Dictionary<string, object>
                                    {
                                        { "type", "Starter & Boots" },
                                        { "recMath", false },
                                        { "items", starterAndBoots }
                                    },
                                    new Dictionary<string, object>
                                    {
                                        { "type", "Randomized Core Build" },
                                        { "recMath", false },
                                        { "items", coreBuild }
                                    }
                                }
                            }
                        };

                        File.WriteAllText(newRecFilePath, serializer.Serialize(recPayload), Encoding.UTF8);
                        itemSetSuccess = true;
                    }
                }
                catch { }

                // --- 3. CHAMP SELECT (AUTO HOVER/SELECT CHAMPION & SPELLS) ---
                bool spellsSuccess = false;
                bool champHovered = false;
                bool inChampSelect = false;

                try
                {
                    string csSession = LcuRequest(lcuPort, lcuPass, "GET", "/lol-champ-select/v1/session");
                    if (!csSession.StartsWith("ERROR:"))
                    {
                        inChampSelect = true;
                        var csObj = serializer.Deserialize<Dictionary<string, object>>(csSession);
                        if (csObj != null)
                        {
                            int localCellId = csObj.ContainsKey("localPlayerCellId") ? Convert.ToInt32(csObj["localPlayerCellId"]) : -1;

                            // 3.A Hover / Select Champion if pick action is active and not yet completed
                            if (champNumericId > 0 && localCellId >= 0 && csObj.ContainsKey("actions") && csObj["actions"] is System.Collections.ArrayList)
                            {
                                var actionGroups = (System.Collections.ArrayList)csObj["actions"];
                                int targetActionId = -1;

                                foreach (var groupObj in actionGroups)
                                {
                                    var groupList = groupObj as System.Collections.ArrayList;
                                    if (groupList == null) continue;

                                    foreach (var actObj in groupList)
                                    {
                                        var actDict = actObj as Dictionary<string, object>;
                                        if (actDict == null) continue;

                                        int actorCellId = actDict.ContainsKey("actorCellId") ? Convert.ToInt32(actDict["actorCellId"]) : -1;
                                        string actType = actDict.ContainsKey("type") ? actDict["type"].ToString() : "";
                                        bool completed = actDict.ContainsKey("completed") && Convert.ToBoolean(actDict["completed"]);

                                        if (actorCellId == localCellId && actType.Equals("pick", StringComparison.OrdinalIgnoreCase) && !completed)
                                        {
                                            targetActionId = actDict.ContainsKey("id") ? Convert.ToInt32(actDict["id"]) : -1;
                                            break;
                                        }
                                    }
                                    if (targetActionId > 0) break;
                                }

                                if (targetActionId > 0)
                                {
                                    var hoverPayload = new Dictionary<string, object>
                                    {
                                        { "championId", champNumericId },
                                        { "completed", false } // Keeps pick uncompleted so player locks in manually
                                    };
                                    string actRes = LcuRequest(lcuPort, lcuPass, "PATCH", "/lol-champ-select/v1/session/actions/" + targetActionId, serializer.Serialize(hoverPayload));
                                    if (!actRes.StartsWith("ERROR:"))
                                    {
                                        champHovered = true;
                                    }
                                }
                            }

                            // 3.B Summoner Spells
                            if (spell1Id > 0 && spell2Id > 0)
                            {
                                var spellPayload = new Dictionary<string, object>
                                {
                                    { "spell1Id", spell1Id },
                                    { "spell2Id", spell2Id }
                                };
                                string patchRes = LcuRequest(lcuPort, lcuPass, "PATCH", "/lol-champ-select/v1/session/my-selection", serializer.Serialize(spellPayload));
                                if (!patchRes.StartsWith("ERROR:"))
                                {
                                    spellsSuccess = true;
                                }
                            }
                        }
                    }
                }
                catch { }

                return serializer.Serialize(new
                {
                    injectType = "solo-loadout",
                    success = (runesSuccess || itemSetSuccess),
                    championName = champName,
                    runesInjected = runesSuccess,
                    runePageName = runePageName,
                    itemSetInjected = itemSetSuccess,
                    spellsInjected = spellsSuccess,
                    champHovered = champHovered,
                    inChampSelect = inChampSelect,
                    message = "Successfully injected " + champName + " loadout into League Client."
                });
            }
            catch (Exception ex)
            {
                return serializer.Serialize(new
                {
                    injectType = "solo-loadout",
                    success = false,
                    error = "Failed to inject loadout: " + ex.Message
                });
            }
        }

        private static string FindLockfile()
        {
            // 1. Ask the running LeagueClient process directly for its exe path.
            //    QueryFullProcessImageName only needs PROCESS_QUERY_LIMITED_INFORMATION
            //    so it works without elevation on any x64 process.
            string[] procNames = new[] { "LeagueClient", "LeagueClientUx" };
            foreach (string procName in procNames)
            {
                try
                {
                    Process[] procs = Process.GetProcessesByName(procName);
                    if (procs.Length == 0) continue;

                    // QueryFullProcessImageName — preferred, no admin required
                    string exePath = GetProcessPath(procs[0].Id);
                    if (!string.IsNullOrEmpty(exePath))
                    {
                        string lf = Path.Combine(Path.GetDirectoryName(exePath), "lockfile");
                        if (File.Exists(lf)) return lf;
                    }

                    // MainModule fallback (works when same bitness or running as admin)
                    try
                    {
                        string lf = Path.Combine(Path.GetDirectoryName(procs[0].MainModule.FileName), "lockfile");
                        if (File.Exists(lf)) return lf;
                    }
                    catch { }
                }
                catch { }
            }

            // 2. Registry — Riot writes the install Location here at install time
            try
            {
                string[] regKeys = new string[]
                {
                    @"SOFTWARE\WOW6432Node\Riot Games, Inc\League of Legends",
                    @"SOFTWARE\Riot Games, Inc\League of Legends"
                };
                foreach (string regKey in regKeys)
                {
                    using (var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(regKey))
                    {
                        if (key == null) continue;
                        object loc = key.GetValue("Location");
                        if (loc != null)
                        {
                            string lf = Path.Combine(loc.ToString(), "lockfile");
                            if (File.Exists(lf)) return lf;
                        }
                    }
                }
            }
            catch { }

            // 3. True filesystem scan — no hardcoded sub-paths.
            //    Walk every fixed drive, recursing into each top-level folder
            //    and any subfolder named "Riot*" or containing "Riot" in its name,
            //    looking for a directory named "League of Legends" that holds a lockfile.
            try
            {
                foreach (System.IO.DriveInfo drive in System.IO.DriveInfo.GetDrives())
                {
                    if (!drive.IsReady || drive.DriveType != System.IO.DriveType.Fixed) continue;
                    string found = ScanDriveForLockfile(drive.RootDirectory.FullName, 0);
                    if (found != null) return found;
                }
            }
            catch { }

            return null;
        }

        // Recursively walks directories looking for "League of Legends\lockfile"
        // Depth-limited to avoid hanging on huge drives.
        private static string ScanDriveForLockfile(string dir, int depth)
        {
            if (depth > 4) return null;
            try
            {
                // If this directory IS the League of Legends folder, check for lockfile
                if (string.Equals(Path.GetFileName(dir), "League of Legends", StringComparison.OrdinalIgnoreCase))
                {
                    string lf = Path.Combine(dir, "lockfile");
                    if (File.Exists(lf)) return lf;
                }

                foreach (string sub in Directory.GetDirectories(dir))
                {
                    string name = Path.GetFileName(sub);
                    // Only recurse into folders that could plausibly contain the game
                    if (depth == 0 ||
                        name.IndexOf("Riot", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        name.IndexOf("League", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        name.Equals("Games", StringComparison.OrdinalIgnoreCase) ||
                        name.Equals("Apps", StringComparison.OrdinalIgnoreCase) ||
                        name.Equals("Program Files", StringComparison.OrdinalIgnoreCase) ||
                        name.Equals("Program Files (x86)", StringComparison.OrdinalIgnoreCase))
                    {
                        string found = ScanDriveForLockfile(sub, depth + 1);
                        if (found != null) return found;
                    }
                }
            }
            catch { }
            return null;
        }

        private static string PostOpggJsonRpc(string toolName, Dictionary<string, object> arguments, int timeoutMs = 15000)
        {
            var serializer = new JavaScriptSerializer();
            var rpcParams = new Dictionary<string, object>
            {
                { "name", toolName },
                { "arguments", arguments }
            };

            var rpcRequest = new Dictionary<string, object>
            {
                { "jsonrpc", "2.0" },
                { "id", 1 },
                { "method", "tools/call" },
                { "params", rpcParams }
            };

            string reqBody = serializer.Serialize(rpcRequest);
            byte[] bodyBytes = Encoding.UTF8.GetBytes(reqBody);

            HttpWebRequest request = (HttpWebRequest)WebRequest.Create("https://mcp-api.op.gg/mcp");
            request.Method = "POST";
            request.ContentType = "application/json";
            request.UserAgent = "LeagueOfCustoms/0.5";
            request.Timeout = timeoutMs;
            request.Proxy = null;
            request.ServicePoint.Expect100Continue = false;
            request.ContentLength = bodyBytes.Length;

            using (Stream stream = request.GetRequestStream())
            {
                stream.Write(bodyBytes, 0, bodyBytes.Length);
            }

            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            using (StreamReader reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8))
            {
                return reader.ReadToEnd();
            }
        }

        public static string FetchOpggProfileJson(string paramStr)
        {
            var serializer = new JavaScriptSerializer();
            try
            {
                if (string.IsNullOrEmpty(paramStr))
                {
                    return serializer.Serialize(new Dictionary<string, object> {
                        { "profileType", "opgg" },
                        { "error", "Missing search parameters." }
                    });
                }

                string[] parts = paramStr.Split('|');
                if (parts.Length < 3)
                {
                    return serializer.Serialize(new Dictionary<string, object> {
                        { "profileType", "opgg" },
                        { "error", "Invalid format. Expected: Name|Tag|Region" }
                    });
                }

                string gameName = parts[0].Trim();
                string tagLine = parts[1].Trim().TrimStart('#');
                string region = parts[2].Trim().ToLowerInvariant();

                if (string.IsNullOrEmpty(gameName) || string.IsNullOrEmpty(tagLine))
                {
                    return serializer.Serialize(new Dictionary<string, object> {
                        { "profileType", "opgg" },
                        { "error", "Please provide both Game Name and Tagline." }
                    });
                }

                // Run summoner profile and match history in parallel to cut search time in half
                string mRespText = null;
                var profileTask = Task.Run(() =>
                {
                    try
                    {
                        return PostOpggJsonRpc("lol_get_summoner_profile", new Dictionary<string, object> {
                            { "game_name", gameName },
                            { "tag_line", tagLine },
                            { "region", region }
                        }, 15000);
                    }
                    catch (Exception ex)
                    {
                        return "ERROR:" + ex.Message;
                    }
                });

                var matchesTask = Task.Run(() =>
                {
                    try
                    {
                        return PostOpggJsonRpc("lol_list_summoner_matches", new Dictionary<string, object> {
                            { "game_name", gameName },
                            { "tag_line", tagLine },
                            { "region", region },
                            { "limit", 20 }
                        }, 15000);
                    }
                    catch
                    {
                        return null;
                    }
                });

                Task.WaitAll(profileTask, matchesTask);

                string responseText = profileTask.Result;
                mRespText = matchesTask.Result;

                if (string.IsNullOrEmpty(responseText) || responseText.StartsWith("ERROR:"))
                {
                    return serializer.Serialize(new Dictionary<string, object> {
                        { "profileType", "opgg" },
                        { "error", responseText != null && responseText.StartsWith("ERROR:") ? responseText.Substring(6) : "Empty response from OP.GG API." }
                    });
                }

                // Check for JSON-RPC error
                if (responseText.IndexOf("\"error\"", StringComparison.OrdinalIgnoreCase) >= 0 &&
                    responseText.IndexOf("\"result\"", StringComparison.OrdinalIgnoreCase) < 0)
                {
                    return serializer.Serialize(new Dictionary<string, object> {
                        { "profileType", "opgg" },
                        { "error", "Summoner not found on OP.GG in region '" + region.ToUpperInvariant() + "'." }
                    });
                }

                // Extract content[0].text
                string text = null;
                Match textMatch = Regex.Match(responseText, "\"text\"\\s*:\\s*\"(.*?)(?<!\\\\)\"", RegexOptions.Singleline);
                if (textMatch.Success)
                {
                    text = Regex.Unescape(textMatch.Groups[1].Value);
                }
                else
                {
                    text = responseText;
                }

                if (text.IndexOf("Summoner(", StringComparison.OrdinalIgnoreCase) < 0)
                {
                    return serializer.Serialize(new Dictionary<string, object> {
                        { "profileType", "opgg" },
                        { "error", "Could not retrieve summoner profile. Please check name and tag." }
                    });
                }

                // 1. Summoner Info
                string foundName = gameName;
                string foundTag = tagLine;
                string iconUrl = "https://opgg-static.akamaized.net/meta/images/profile_icons/profileIcon1.jpg";
                int level = 1;

                Match sumMatch = Regex.Match(text, @"Summoner\([^,]+,[^,]+,[^,]+,[^,]+,""([^""]+)"",""([^""]+)"",(?:null|""[^""]*""),""[^""]*"",""[^""]*"",""([^""]+)"",(\d+)");
                if (sumMatch.Success)
                {
                    foundName = sumMatch.Groups[1].Value;
                    foundTag = sumMatch.Groups[2].Value;
                    iconUrl = sumMatch.Groups[3].Value;
                    int.TryParse(sumMatch.Groups[4].Value, out level);
                }
                else
                {
                    Match iconMatch = Regex.Match(text, @"https://opgg-static\.akamaized\.net/meta/images/profile_icons/[^""\s,)]+");
                    if (iconMatch.Success) iconUrl = iconMatch.Value;
                }

                // 2. Solo Ranked Info
                string soloTier = "UNRANKED";
                int soloDivision = 0;
                int soloLp = 0;
                string soloMedalUrl = "https://opgg-static.akamaized.net/images/medals_new/default_unranked.svg";
                int soloWin = 0;
                int soloLose = 0;

                Match soloMatch = Regex.Match(text, @"LeagueStat\(""SOLORANKED"",TierInfo\(([^)]+)\),(\d+)?,?(\d+)?");
                if (soloMatch.Success)
                {
                    string inner = soloMatch.Groups[1].Value;
                    string[] tParts = inner.Split(',');
                    if (tParts.Length > 0 && !string.IsNullOrEmpty(tParts[0]) && tParts[0].Trim() != "null")
                    {
                        soloTier = tParts[0].Replace("\"", "").Trim();
                    }
                    if (tParts.Length > 1) int.TryParse(tParts[1].Trim(), out soloDivision);
                    if (tParts.Length > 2) int.TryParse(tParts[2].Trim(), out soloLp);
                    if (tParts.Length > 4 && tParts[4].Contains("http"))
                    {
                        soloMedalUrl = tParts[4].Replace("\"", "").Trim();
                    }
                    if (soloMatch.Groups[2].Success) int.TryParse(soloMatch.Groups[2].Value, out soloWin);
                    if (soloMatch.Groups[3].Success) int.TryParse(soloMatch.Groups[3].Value, out soloLose);
                }

                // 3. Flex Ranked Info
                string flexTier = "UNRANKED";
                int flexDivision = 0;
                int flexLp = 0;
                string flexMedalUrl = "https://opgg-static.akamaized.net/images/medals_new/default_unranked.svg";
                int flexWin = 0;
                int flexLose = 0;

                Match flexMatch = Regex.Match(text, @"LeagueStat\(""FLEXRANKED"",TierInfo\(([^)]+)\),(\d+)?,?(\d+)?");
                if (flexMatch.Success)
                {
                    string inner = flexMatch.Groups[1].Value;
                    string[] tParts = inner.Split(',');
                    if (tParts.Length > 0 && !string.IsNullOrEmpty(tParts[0]) && tParts[0].Trim() != "null")
                    {
                        flexTier = tParts[0].Replace("\"", "").Trim();
                    }
                    if (tParts.Length > 1) int.TryParse(tParts[1].Trim(), out flexDivision);
                    if (tParts.Length > 2) int.TryParse(tParts[2].Trim(), out flexLp);
                    if (tParts.Length > 4 && tParts[4].Contains("http"))
                    {
                        flexMedalUrl = tParts[4].Replace("\"", "").Trim();
                    }
                    if (flexMatch.Groups[2].Success) int.TryParse(flexMatch.Groups[2].Value, out flexWin);
                    if (flexMatch.Groups[3].Success) int.TryParse(flexMatch.Groups[3].Value, out flexLose);
                }

                // 4. Most Champions (Top 7)
                MatchCollection champMatches = Regex.Matches(text, @"ChampionStat\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),[^)]*?""([^""]+)""\)");
                var champList = new List<Dictionary<string, object>>();
                int count = 0;
                foreach (Match cm in champMatches)
                {
                    if (count >= 7) break;
                    string cId = cm.Groups[1].Value;
                    int cPlay = 0; int.TryParse(cm.Groups[2].Value, out cPlay);
                    int cWin = 0; int.TryParse(cm.Groups[3].Value, out cWin);
                    int cLose = 0; int.TryParse(cm.Groups[4].Value, out cLose);
                    int cKill = 0; int.TryParse(cm.Groups[6].Value, out cKill);
                    int cDeath = 0; int.TryParse(cm.Groups[7].Value, out cDeath);
                    int cAssist = 0; int.TryParse(cm.Groups[8].Value, out cAssist);
                    string cName = cm.Groups[9].Value;

                    double cWinrate = cPlay > 0 ? Math.Round((double)cWin / cPlay * 100.0, 1) : 0;
                    double kda = cDeath > 0 ? Math.Round((double)(cKill + cAssist) / cDeath, 2) : Math.Round((double)(cKill + cAssist), 2);

                    var champObj = new Dictionary<string, object>
                    {
                        { "id", cId },
                        { "name", cName },
                        { "play", cPlay },
                        { "win", cWin },
                        { "lose", cLose },
                        { "winrate", cWinrate },
                        { "kills", cKill },
                        { "deaths", cDeath },
                        { "assists", cAssist },
                        { "kda", kda }
                    };
                    champList.Add(champObj);
                    count++;
                }

                var result = new Dictionary<string, object>
                {
                    { "profileType", "opgg" },
                    { "gameName", foundName },
                    { "tagLine", foundTag },
                    { "region", region },
                    { "level", level },
                    { "iconUrl", iconUrl },
                    { "soloTier", soloTier },
                    { "soloDivision", soloDivision },
                    { "soloLP", soloLp },
                    { "soloMedalUrl", soloMedalUrl },
                    { "soloWin", soloWin },
                    { "soloLose", soloLose },
                    { "flexTier", flexTier },
                    { "flexDivision", flexDivision },
                    { "flexLP", flexLp },
                    { "flexMedalUrl", flexMedalUrl },
                    { "flexWin", flexWin },
                    { "flexLose", flexLose },
                    { "champions", champList }
                };

                // 5. Recent Matches via lol_list_summoner_matches (fetched concurrently in parallel)
                var matchesList = new List<Dictionary<string, object>>();
                try
                {
                    if (!string.IsNullOrEmpty(mRespText))
                    {
                        string unescapedMatches = null;
                        try
                        {
                            var mJsonObj = serializer.Deserialize<Dictionary<string, object>>(mRespText);
                            if (mJsonObj != null && mJsonObj.ContainsKey("result"))
                            {
                                var mResultDict = mJsonObj["result"] as Dictionary<string, object>;
                                if (mResultDict != null && mResultDict.ContainsKey("content"))
                                {
                                    var cList = mResultDict["content"] as System.Collections.IEnumerable;
                                    if (cList != null)
                                    {
                                        foreach (var itm in cList)
                                        {
                                            var dict = itm as Dictionary<string, object>;
                                            if (dict != null && dict.ContainsKey("text"))
                                            {
                                                unescapedMatches = dict["text"] as string;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        catch { }

                        if (string.IsNullOrEmpty(unescapedMatches))
                        {
                            Match mTextMatch = Regex.Match(mRespText, "\"text\"\\s*:\\s*\"(.*?)(?<!\\\\)\"", RegexOptions.Singleline);
                            if (mTextMatch.Success)
                            {
                                unescapedMatches = Regex.Unescape(mTextMatch.Groups[1].Value);
                            }
                            else
                            {
                                unescapedMatches = mRespText;
                            }
                        }

                        string[] gameBlocks = unescapedMatches.Split(new string[] { "GameHistory(" }, StringSplitOptions.RemoveEmptyEntries);
                        int mCount = 0;
                        for (int i = 1; i < gameBlocks.Length && mCount < 20; i++)
                        {
                            string g = gameBlocks[i];
                            var hMatch = Regex.Match(g, @"^""([^""]*)"",\s*""([^""]*)"",\s*""([^""]*)"",\s*""([^""]*)"",\s*(\d+)");
                            if (!hMatch.Success) continue;
                            string gameId = hMatch.Groups[1].Value;
                            string createdAt = hMatch.Groups[2].Value;
                            string gMap = hMatch.Groups[3].Value;
                            string gType = hMatch.Groups[4].Value;
                            int duration = 0; int.TryParse(hMatch.Groups[5].Value, out duration);

                            var pMatch = Regex.Match(g, @"Participant\d*\(Summoner\d*\([^)]*\),\s*(\d+),\s*""([^""]*)"",\s*""([^""]*)"",\s*""([^""]*)"",\s*\[([^\]]*)\],\s*\[([^\]]*)\]");
                            if (pMatch.Success)
                            {
                                string mChampId = pMatch.Groups[1].Value;
                                string mChampName = pMatch.Groups[2].Value;
                                string mTeam = pMatch.Groups[3].Value;
                                string mPos = pMatch.Groups[4].Value;
                                string itemIdsStr = pMatch.Groups[5].Value;
                                string itemNamesStr = pMatch.Groups[6].Value;

                                var runeMatch = Regex.Match(g, @"Rune\d*\((\d+),\s*(\d+),\s*(\d+)\)");
                                var runesArr = new List<int>();
                                if (runeMatch.Success)
                                {
                                    int r1, r2, r3;
                                    if (int.TryParse(runeMatch.Groups[1].Value, out r1)) runesArr.Add(r1);
                                    if (int.TryParse(runeMatch.Groups[2].Value, out r2)) runesArr.Add(r2);
                                    if (int.TryParse(runeMatch.Groups[3].Value, out r3)) runesArr.Add(r3);
                                }

                                var spellsMatch = Regex.Match(g, @"Rune\d*\([^)]*\),\s*\[([^\]]*)\]");
                                var spellsArr = new List<int>();
                                if (spellsMatch.Success)
                                {
                                    foreach (var rawSp in spellsMatch.Groups[1].Value.Split(','))
                                    {
                                        int spVal;
                                        if (int.TryParse(rawSp.Trim(), out spVal)) spellsArr.Add(spVal);
                                    }
                                }

                                var statsMatch = Regex.Match(g, @"Stats\d*\(([^\[]+)");
                                int mLevel = 1, mDmgTaken = 0, mDmgDealt = 0, critDamage = 0, timeCCing = 0, controlWards = 0, wardsPlaced = 0;
                                int mKills = 0, mDeaths = 0, mAssists = 0, multiKill = 0, killingSpree = 0, laneCs = 0, jungleCs = 0, gold = 0, heal = 0;
                                string resultStr = "UNKNOWN";
                                double opScore = 0;
                                int opScoreRank = 0;

                                if (statsMatch.Success)
                                {
                                    string[] sParts = statsMatch.Groups[1].Value.Split(',');
                                    for (int sIdx = 0; sIdx < sParts.Length; sIdx++) sParts[sIdx] = sParts[sIdx].Trim().Trim('"');

                                    if (sParts.Length > 0) int.TryParse(sParts[0], out mLevel);
                                    if (sParts.Length > 1) int.TryParse(sParts[1], out mDmgTaken);
                                    if (sParts.Length > 2) int.TryParse(sParts[2], out mDmgDealt);
                                    if (sParts.Length > 3) int.TryParse(sParts[3], out critDamage);
                                    if (sParts.Length > 4) int.TryParse(sParts[4], out timeCCing);
                                    if (sParts.Length > 5) int.TryParse(sParts[5], out controlWards);
                                    if (sParts.Length > 6) int.TryParse(sParts[6], out wardsPlaced);
                                    if (sParts.Length > 7) int.TryParse(sParts[7], out mKills);
                                    if (sParts.Length > 8) int.TryParse(sParts[8], out mDeaths);
                                    if (sParts.Length > 9) int.TryParse(sParts[9], out mAssists);
                                    if (sParts.Length > 10) int.TryParse(sParts[10], out multiKill);
                                    if (sParts.Length > 11) int.TryParse(sParts[11], out killingSpree);
                                    if (sParts.Length > 12) int.TryParse(sParts[12], out laneCs);
                                    if (sParts.Length > 15) int.TryParse(sParts[15], out jungleCs);
                                    if (sParts.Length > 16) int.TryParse(sParts[16], out gold);
                                    if (sParts.Length > 17) int.TryParse(sParts[17], out heal);
                                    if (sParts.Length > 18) resultStr = sParts[18];
                                    if (sParts.Length > 19) double.TryParse(sParts[19], System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out opScore);
                                    if (sParts.Length > 20) int.TryParse(sParts[20], out opScoreRank);
                                }

                                var itemsArr = new List<int>();
                                foreach (var rawId in itemIdsStr.Split(','))
                                {
                                    int itemIdVal;
                                    if (int.TryParse(rawId.Trim(), out itemIdVal)) itemsArr.Add(itemIdVal);
                                }

                                var itemNamesArr = new List<string>();
                                foreach (var rawName in itemNamesStr.Split(','))
                                {
                                    string trimmed = rawName.Trim().Trim('"');
                                    if (!string.IsNullOrEmpty(trimmed)) itemNamesArr.Add(trimmed);
                                }

                                var trinketMatch = Regex.Match(g, @"\),\s*(\d+)\s*\)\s*\]");
                                if (trinketMatch.Success)
                                {
                                    int trinketId;
                                    if (int.TryParse(trinketMatch.Groups[1].Value, out trinketId) && trinketId > 0 && itemsArr.Count <= 6)
                                    {
                                        itemsArr.Add(trinketId);
                                        itemNamesArr.Add("Trinket #" + trinketId);
                                    }
                                }

                                double mKda = mDeaths > 0 ? Math.Round((double)(mKills + mAssists) / mDeaths, 2) : Math.Round((double)(mKills + mAssists), 2);
                                int totalCs = laneCs + jungleCs;
                                double csPerMin = duration > 0 ? Math.Round((double)totalCs / (duration / 60.0), 1) : 0;

                                string multiKillStr = multiKill >= 5 ? "Penta Kill" :
                                                      multiKill == 4 ? "Quadra Kill" :
                                                      multiKill == 3 ? "Triple Kill" :
                                                      multiKill == 2 ? "Double Kill" : "";

                                // Format duration as mm:ss
                                string durationStr = string.Format("{0}:{1:D2}", duration / 60, duration % 60);

                                // Compute timeAgo from createdAt ISO string
                                string timeAgoStr = "";
                                DateTime parsedDt;
                                if (DateTime.TryParse(createdAt, null, System.Globalization.DateTimeStyles.RoundtripKind, out parsedDt))
                                {
                                    TimeSpan ago = DateTime.UtcNow - parsedDt.ToUniversalTime();
                                    if (ago.TotalMinutes < 60)
                                        timeAgoStr = string.Format("{0}m ago", (int)ago.TotalMinutes);
                                    else if (ago.TotalHours < 24)
                                        timeAgoStr = string.Format("{0}h ago", (int)ago.TotalHours);
                                    else
                                        timeAgoStr = string.Format("{0}d ago", (int)ago.TotalDays);
                                }

                                // Format queue label
                                string queueLabel = gType == "SOLORANKED" ? "Ranked Solo" :
                                                    gType == "FLEXRANKED" ? "Ranked Flex" :
                                                    gType == "ARAM" ? "ARAM" :
                                                    gType == "NORMAL" ? "Normal" : gType;

                                var matchObj = new Dictionary<string, object>
                                {
                                    { "gameId", gameId },
                                    { "createdAt", createdAt },
                                    { "queue", queueLabel },
                                    { "duration", durationStr },
                                    { "durationSec", duration },
                                    { "timeAgo", timeAgoStr },
                                    { "championId", mChampId },
                                    { "championName", mChampName },
                                    { "championLevel", mLevel },
                                    { "team", mTeam },
                                    { "position", mPos },
                                    { "kills", mKills },
                                    { "deaths", mDeaths },
                                    { "assists", mAssists },
                                    { "kda", mKda },
                                    { "cs", totalCs },
                                    { "laneCs", laneCs },
                                    { "jungleCs", jungleCs },
                                    { "csPerMin", csPerMin },
                                    { "gold", gold },
                                    { "damageDealt", mDmgDealt },
                                    { "damageTaken", mDmgTaken },
                                    { "heal", heal },
                                    { "wardsPlaced", wardsPlaced },
                                    { "controlWards", controlWards },
                                    { "ccDuration", timeCCing },
                                    { "multiKill", multiKillStr },
                                    { "killingSpree", killingSpree },
                                    { "critDamage", critDamage },
                                    { "opScore", opScore },
                                    { "opScoreRank", opScoreRank },
                                    { "runes", runesArr },
                                    { "spells", spellsArr },
                                    { "win", resultStr == "WIN" },
                                    { "items", itemsArr },
                                    { "itemNames", itemNamesArr }
                                };
                                matchesList.Add(matchObj);
                                mCount++;
                            }
                        }
                    }
                }
                catch { }

                result["matches"] = matchesList;

                return serializer.Serialize(result);
            }
            catch (Exception ex)
            {
                return serializer.Serialize(new Dictionary<string, object> {
                    { "profileType", "opgg" },
                    { "error", "Network or OP.GG API error: " + ex.Message }
                });
            }
        }

        public static string FetchGameDetailJson(string paramStr)
        {
            var serializer = new JavaScriptSerializer();
            try
            {
                string[] parts = paramStr.Split('|');
                if (parts.Length < 5)
                {
                    return serializer.Serialize(new Dictionary<string, object> {
                        { "gameDetailType", "opgg" },
                        { "error", "Invalid arguments for game detail" }
                    });
                }
                string gameId = parts[0].Trim();
                string createdAt = parts[1].Trim();
                string gameName = parts[2].Trim();
                string tagLine = parts[3].Trim();
                string region = parts[4].Trim().ToLowerInvariant();

                var args = new Dictionary<string, object>
                {
                    { "region", region },
                    { "game_id", gameId },
                    { "created_at", createdAt },
                    { "game_name", gameName },
                    { "tag_line", tagLine }
                };
                string responseText = PostOpggJsonRpc("lol_get_summoner_game_detail", args, 15000);

                string dslText = null;
                try
                {
                    var resp = serializer.Deserialize<Dictionary<string, object>>(responseText);
                    var resultObj = resp != null && resp.ContainsKey("result") ? resp["result"] as Dictionary<string, object> : null;
                    var content = resultObj != null && resultObj.ContainsKey("content") ? resultObj["content"] as System.Collections.IEnumerable : null;
                    if (content != null)
                        foreach (var itm in content)
                        {
                            var d = itm as Dictionary<string, object>;
                            if (d != null && d.ContainsKey("text")) { dslText = d["text"] as string; break; }
                        }
                }
                catch { }
                if (string.IsNullOrEmpty(dslText))
                {
                    Match tm = Regex.Match(responseText, "\"text\"\\s*:\\s*\"(.*?)(?<!\\\\)\"", RegexOptions.Singleline);
                    if (tm.Success) dslText = Regex.Unescape(tm.Groups[1].Value);
                    else dslText = responseText;
                }

                var teams = new List<Dictionary<string, object>>();
                string[] teamBlocks = Regex.Split(dslText, @"Team\d*\(""(BLUE|RED)"",\s*GameStat\d*\(([^)]+)\)");
                for (int i = 1; i < teamBlocks.Length; i += 3)
                {
                    string teamKey = teamBlocks[i];
                    string gameStatStr = teamBlocks[i + 1];
                    string body = teamBlocks[i + 2];

                    string[] gsParts = gameStatStr.Split(',');
                    for (int gIdx = 0; gIdx < gsParts.Length; gIdx++) gsParts[gIdx] = gsParts[gIdx].Trim().Trim('"');

                    bool isWin = gsParts.Length > 0 && gsParts[0] == "true";
                    int teamKills = 0; if (gsParts.Length > 1) int.TryParse(gsParts[1], out teamKills);
                    int teamDragons = 0; if (gsParts.Length > 5) int.TryParse(gsParts[5], out teamDragons);
                    int teamBarons = 0; if (gsParts.Length > 6) int.TryParse(gsParts[6], out teamBarons);
                    int teamTowers = 0; if (gsParts.Length > 7) int.TryParse(gsParts[7], out teamTowers);
                    int teamGold = 0; if (gsParts.Length > 10) int.TryParse(gsParts[10], out teamGold);

                    string[] pBlocks = Regex.Split(body, @"Participant\d*\(");
                    var participants = new List<Dictionary<string, object>>();
                    for (int j = 1; j < pBlocks.Length; j++)
                    {
                        string pb = pBlocks[j];
                        var sumMatch = Regex.Match(pb, @"Summoner\d*\([^,]+,\s*""([^""]*)"",\s*""([^""]*)""");
                        var champMatch = Regex.Match(pb, @"(\d+),\s*""([^""]*)"",\s*""([^""]*)"",\s*""([^""]*)"",\s*\[([^\]]*)\],\s*\[([^\]]*)\]");
                        var runeMatch = Regex.Match(pb, @"Rune\d*\((\d+),\s*(\d+),\s*(\d+)\)");
                        var spellsMatch = Regex.Match(pb, @"Rune\d*\([^)]*\),\s*\[([^\]]*)\]");
                        var statsMatch = Regex.Match(pb, @"Stats\d*\(([^\[]+)");

                        if (champMatch.Success && statsMatch.Success)
                        {
                            string pGameName = sumMatch.Success ? sumMatch.Groups[1].Value : "Unknown";
                            string pTagLine = sumMatch.Success ? sumMatch.Groups[2].Value : "";
                            string pChampId = champMatch.Groups[1].Value;
                            string pChampName = champMatch.Groups[2].Value;
                            string pTeam = champMatch.Groups[3].Value;
                            string pPos = champMatch.Groups[4].Value;
                            string itemIdsStr = champMatch.Groups[5].Value;
                            string itemNamesStr = champMatch.Groups[6].Value;

                            var itemsArr = new List<int>();
                            foreach (var rawId in itemIdsStr.Split(',')) { int v; if (int.TryParse(rawId.Trim(), out v)) itemsArr.Add(v); }
                            var itemNamesArr = new List<string>();
                            foreach (var rawN in itemNamesStr.Split(',')) { string t = rawN.Trim().Trim('"'); if (!string.IsNullOrEmpty(t)) itemNamesArr.Add(t); }

                            var pTrinketMatch = Regex.Match(pb, @"\),\s*(\d+)\s*\)");
                            if (pTrinketMatch.Success)
                            {
                                int trinketId;
                                if (int.TryParse(pTrinketMatch.Groups[1].Value, out trinketId) && trinketId > 0 && itemsArr.Count <= 6)
                                {
                                    itemsArr.Add(trinketId);
                                    itemNamesArr.Add("Trinket #" + trinketId);
                                }
                            }

                            var spellsArr = new List<int>();
                            if (spellsMatch.Success) foreach (var rawSp in spellsMatch.Groups[1].Value.Split(',')) { int spVal; if (int.TryParse(rawSp.Trim(), out spVal)) spellsArr.Add(spVal); }

                            string[] sParts = statsMatch.Groups[1].Value.Split(',');
                            for (int sIdx = 0; sIdx < sParts.Length; sIdx++) sParts[sIdx] = sParts[sIdx].Trim().Trim('"');
                            int pLevel = 1, pDmgTaken = 0, pDmgDealt = 0, pControlWards = 0, pWards = 0;
                            int pKills = 0, pDeaths = 0, pAssists = 0, pMultiKill = 0, pKillingSpree = 0;
                            int pLaneCs = 0, pJungleCs = 0, pGold = 0, pHeal = 0;
                            string pResult = "UNKNOWN"; double pOpScore = 0; int pOpScoreRank = 0;

                            if (sParts.Length > 0) int.TryParse(sParts[0], out pLevel);
                            if (sParts.Length > 1) int.TryParse(sParts[1], out pDmgTaken);
                            if (sParts.Length > 2) int.TryParse(sParts[2], out pDmgDealt);
                            if (sParts.Length > 5) int.TryParse(sParts[5], out pControlWards);
                            if (sParts.Length > 6) int.TryParse(sParts[6], out pWards);
                            if (sParts.Length > 7) int.TryParse(sParts[7], out pKills);
                            if (sParts.Length > 8) int.TryParse(sParts[8], out pDeaths);
                            if (sParts.Length > 9) int.TryParse(sParts[9], out pAssists);
                            if (sParts.Length > 10) int.TryParse(sParts[10], out pMultiKill);
                            if (sParts.Length > 11) int.TryParse(sParts[11], out pKillingSpree);
                            if (sParts.Length > 12) int.TryParse(sParts[12], out pLaneCs);
                            if (sParts.Length > 15) int.TryParse(sParts[15], out pJungleCs);
                            if (sParts.Length > 16) int.TryParse(sParts[16], out pGold);
                            if (sParts.Length > 17) int.TryParse(sParts[17], out pHeal);
                            if (sParts.Length > 18) pResult = sParts[18];
                            if (sParts.Length > 19) double.TryParse(sParts[19], System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out pOpScore);
                            if (sParts.Length > 20) int.TryParse(sParts[20], out pOpScoreRank);

                            double pKda = pDeaths > 0 ? Math.Round((double)(pKills + pAssists) / pDeaths, 2) : Math.Round((double)(pKills + pAssists), 2);

                            participants.Add(new Dictionary<string, object>
                            {
                                { "gameName", pGameName },
                                { "tagLine", pTagLine },
                                { "championId", pChampId },
                                { "championName", pChampName },
                                { "team", pTeam },
                                { "position", pPos },
                                { "level", pLevel },
                                { "kills", pKills },
                                { "deaths", pDeaths },
                                { "assists", pAssists },
                                { "kda", pKda },
                                { "damageDealt", pDmgDealt },
                                { "damageTaken", pDmgTaken },
                                { "heal", pHeal },
                                { "cs", pLaneCs + pJungleCs },
                                { "gold", pGold },
                                { "items", itemsArr },
                                { "itemNames", itemNamesArr },
                                { "spells", spellsArr },
                                { "opScore", pOpScore },
                                { "opScoreRank", pOpScoreRank },
                                { "win", pResult == "WIN" }
                            });
                        }
                    }

                    teams.Add(new Dictionary<string, object>
                    {
                        { "key", teamKey },
                        { "isWin", isWin },
                        { "teamKills", teamKills },
                        { "towerKills", teamTowers },
                        { "dragonKills", teamDragons },
                        { "baronKills", teamBarons },
                        { "gold", teamGold },
                        { "participants", participants }
                    });
                }

                return serializer.Serialize(new Dictionary<string, object>
                {
                    { "gameDetailType", "opgg" },
                    { "gameId", gameId },
                    { "profileGameName", gameName },
                    { "profileTagLine", tagLine },
                    { "teams", teams }
                });
            }
            catch (Exception ex)
            {
                return serializer.Serialize(new Dictionary<string, object> {
                    { "gameDetailType", "opgg" },
                    { "error", "Game detail error: " + ex.Message }
                });
            }
        }

        public static string FetchMoreMatchesJson(string paramStr)
        {
            var serializer = new JavaScriptSerializer();
            try
            {
                string[] parts = paramStr.Split('|');
                if (parts.Length < 4)
                {
                    return serializer.Serialize(new Dictionary<string, object> {
                        { "moreMatchesType", "opgg" },
                        { "error", "Invalid arguments" }
                    });
                }
                string gameName = parts[0].Trim();
                string tagLine = parts[1].Trim().TrimStart('#');
                string region = parts[2].Trim().ToLowerInvariant();
                string endedAt = parts[3].Trim();

                var matchesArgs = new Dictionary<string, object>
                {
                    { "game_name", gameName },
                    { "tag_line", tagLine },
                    { "region", region },
                    { "limit", 20 }
                };
                if (!string.IsNullOrEmpty(endedAt))
                {
                    matchesArgs["ended_at"] = endedAt;
                }

                string mRespText = PostOpggJsonRpc("lol_list_summoner_matches", matchesArgs, 15000);

                string unescapedMatches = null;
                try
                {
                    var mJsonObj = serializer.Deserialize<Dictionary<string, object>>(mRespText);
                    if (mJsonObj != null && mJsonObj.ContainsKey("result"))
                    {
                        var mResultDict = mJsonObj["result"] as Dictionary<string, object>;
                        if (mResultDict != null && mResultDict.ContainsKey("content"))
                        {
                            var cList = mResultDict["content"] as System.Collections.IEnumerable;
                            if (cList != null)
                                foreach (var itm in cList)
                                {
                                    var dict = itm as Dictionary<string, object>;
                                    if (dict != null && dict.ContainsKey("text")) { unescapedMatches = dict["text"] as string; break; }
                                }
                        }
                    }
                }
                catch { }
                if (string.IsNullOrEmpty(unescapedMatches))
                {
                    Match mTextMatch = Regex.Match(mRespText, "\"text\"\\s*:\\s*\"(.*?)(?<!\\\\)\"", RegexOptions.Singleline);
                    if (mTextMatch.Success) unescapedMatches = Regex.Unescape(mTextMatch.Groups[1].Value);
                    else unescapedMatches = mRespText;
                }

                var matchesList = new List<Dictionary<string, object>>();
                string[] gameBlocks = unescapedMatches.Split(new string[] { "GameHistory(" }, StringSplitOptions.RemoveEmptyEntries);
                int mCount = 0;
                for (int i = 1; i < gameBlocks.Length && mCount < 20; i++)
                {
                    string g = gameBlocks[i];
                    var hMatch = Regex.Match(g, @"^""([^""]*)"",\s*""([^""]*)"",\s*""([^""]*)"",\s*""([^""]*)"",\s*(\d+)");
                    if (!hMatch.Success) continue;
                    string mGameId = hMatch.Groups[1].Value;
                    string mCreatedAt = hMatch.Groups[2].Value;
                    string gMap = hMatch.Groups[3].Value;
                    string gType = hMatch.Groups[4].Value;
                    int duration = 0; int.TryParse(hMatch.Groups[5].Value, out duration);

                    var pMatch = Regex.Match(g, @"Participant\d*\(Summoner\d*\([^)]*\),\s*(\d+),\s*""([^""]*)"",\s*""([^""]*)"",\s*""([^""]*)"",\s*\[([^\]]*)\],\s*\[([^\]]*)\]");
                    if (!pMatch.Success) continue;

                    string mChampId = pMatch.Groups[1].Value;
                    string mChampName = pMatch.Groups[2].Value;
                    string mTeam = pMatch.Groups[3].Value;
                    string mPos = pMatch.Groups[4].Value;
                    string itemIdsStr = pMatch.Groups[5].Value;
                    string itemNamesStr = pMatch.Groups[6].Value;

                    var runeMatch = Regex.Match(g, @"Rune\d*\((\d+),\s*(\d+),\s*(\d+)\)");
                    var runesArr = new List<int>();
                    if (runeMatch.Success) { int r1,r2,r3; if(int.TryParse(runeMatch.Groups[1].Value,out r1))runesArr.Add(r1); if(int.TryParse(runeMatch.Groups[2].Value,out r2))runesArr.Add(r2); if(int.TryParse(runeMatch.Groups[3].Value,out r3))runesArr.Add(r3); }

                    var spellsMatch = Regex.Match(g, @"Rune\d*\([^)]*\),\s*\[([^\]]*)\]");
                    var spellsArr = new List<int>();
                    if (spellsMatch.Success) foreach (var rawSp in spellsMatch.Groups[1].Value.Split(',')) { int spVal; if (int.TryParse(rawSp.Trim(), out spVal)) spellsArr.Add(spVal); }

                    var statsMatch = Regex.Match(g, @"Stats\d*\(([^\[]+)");
                    int mLevel=1,mDmgTaken=0,mDmgDealt=0,critDamage=0,timeCCing=0,controlWards=0,wardsPlaced=0;
                    int mKills=0,mDeaths=0,mAssists=0,multiKill=0,killingSpree=0,laneCs=0,jungleCs=0,gold=0,heal=0;
                    string resultStr="UNKNOWN"; double opScore=0; int opScoreRank=0;
                    if (statsMatch.Success)
                    {
                        string[] sParts = statsMatch.Groups[1].Value.Split(',');
                        for (int sIdx=0;sIdx<sParts.Length;sIdx++) sParts[sIdx]=sParts[sIdx].Trim().Trim('"');
                        if(sParts.Length>0)int.TryParse(sParts[0],out mLevel);
                        if(sParts.Length>1)int.TryParse(sParts[1],out mDmgTaken);
                        if(sParts.Length>2)int.TryParse(sParts[2],out mDmgDealt);
                        if(sParts.Length>3)int.TryParse(sParts[3],out critDamage);
                        if(sParts.Length>4)int.TryParse(sParts[4],out timeCCing);
                        if(sParts.Length>5)int.TryParse(sParts[5],out controlWards);
                        if(sParts.Length>6)int.TryParse(sParts[6],out wardsPlaced);
                        if(sParts.Length>7)int.TryParse(sParts[7],out mKills);
                        if(sParts.Length>8)int.TryParse(sParts[8],out mDeaths);
                        if(sParts.Length>9)int.TryParse(sParts[9],out mAssists);
                        if(sParts.Length>10)int.TryParse(sParts[10],out multiKill);
                        if(sParts.Length>11)int.TryParse(sParts[11],out killingSpree);
                        if(sParts.Length>12)int.TryParse(sParts[12],out laneCs);
                        if(sParts.Length>15)int.TryParse(sParts[15],out jungleCs);
                        if(sParts.Length>16)int.TryParse(sParts[16],out gold);
                        if(sParts.Length>17)int.TryParse(sParts[17],out heal);
                        if(sParts.Length>18)resultStr=sParts[18];
                        if(sParts.Length>19)double.TryParse(sParts[19],System.Globalization.NumberStyles.Any,System.Globalization.CultureInfo.InvariantCulture,out opScore);
                        if(sParts.Length>20)int.TryParse(sParts[20],out opScoreRank);
                    }

                    var itemsArr = new List<int>();
                    foreach (var rawId in itemIdsStr.Split(',')) { int v; if(int.TryParse(rawId.Trim(),out v)) itemsArr.Add(v); }
                    var itemNamesArr = new List<string>();
                    foreach (var rawName in itemNamesStr.Split(',')) { string t=rawName.Trim().Trim('"'); if(!string.IsNullOrEmpty(t)) itemNamesArr.Add(t); }

                    var trinketMatch = Regex.Match(g, @"\),\s*(\d+)\s*\)\s*\]");
                    if (trinketMatch.Success)
                    {
                        int trinketId;
                        if (int.TryParse(trinketMatch.Groups[1].Value, out trinketId) && trinketId > 0 && itemsArr.Count <= 6)
                        {
                            itemsArr.Add(trinketId);
                            itemNamesArr.Add("Trinket #" + trinketId);
                        }
                    }

                    double mKda = mDeaths>0 ? Math.Round((double)(mKills+mAssists)/mDeaths,2) : Math.Round((double)(mKills+mAssists),2);
                    int totalCs = laneCs+jungleCs;
                    double csPerMin = duration>0 ? Math.Round((double)totalCs/(duration/60.0),1) : 0;
                    string multiKillStr = multiKill>=5?"Penta Kill":multiKill==4?"Quadra Kill":multiKill==3?"Triple Kill":multiKill==2?"Double Kill":"";
                    string durationStr = string.Format("{0}:{1:D2}",duration/60,duration%60);
                    string timeAgoStr="";
                    DateTime parsedDt;
                    if(DateTime.TryParse(mCreatedAt,null,System.Globalization.DateTimeStyles.RoundtripKind,out parsedDt))
                    {
                        TimeSpan ago=DateTime.UtcNow-parsedDt.ToUniversalTime();
                        if(ago.TotalMinutes<60) timeAgoStr=string.Format("{0}m ago",(int)ago.TotalMinutes);
                        else if(ago.TotalHours<24) timeAgoStr=string.Format("{0}h ago",(int)ago.TotalHours);
                        else timeAgoStr=string.Format("{0}d ago",(int)ago.TotalDays);
                    }
                    string queueLabel=gType=="SOLORANKED"?"Ranked Solo":gType=="FLEXRANKED"?"Ranked Flex":gType=="ARAM"?"ARAM":gType=="NORMAL"?"Normal":gType;

                    matchesList.Add(new Dictionary<string, object>
                    {
                        {"gameId",mGameId},{"createdAt",mCreatedAt},{"queue",queueLabel},
                        {"duration",durationStr},{"durationSec",duration},{"timeAgo",timeAgoStr},
                        {"championId",mChampId},{"championName",mChampName},{"championLevel",mLevel},{"team",mTeam},{"position",mPos},
                        {"kills",mKills},{"deaths",mDeaths},{"assists",mAssists},{"kda",mKda},
                        {"cs",totalCs},{"laneCs",laneCs},{"jungleCs",jungleCs},{"csPerMin",csPerMin},
                        {"gold",gold},{"damageDealt",mDmgDealt},{"damageTaken",mDmgTaken},{"heal",heal},
                        {"wardsPlaced",wardsPlaced},{"controlWards",controlWards},{"ccDuration",timeCCing},
                        {"multiKill",multiKillStr},{"killingSpree",killingSpree},{"critDamage",critDamage},
                        {"opScore",opScore},{"opScoreRank",opScoreRank},{"runes",runesArr},
                        {"spells",spellsArr},{"win",resultStr=="WIN"},{"items",itemsArr},{"itemNames",itemNamesArr}
                    });
                    mCount++;
                }

                return serializer.Serialize(new Dictionary<string, object>
                {
                    { "moreMatchesType", "opgg" },
                    { "matches", matchesList }
                });
            }
            catch (Exception ex)
            {
                return serializer.Serialize(new Dictionary<string, object> {
                    { "moreMatchesType", "opgg" },
                    { "error", "More matches error: " + ex.Message }
                });
            }
        }

        public static string FetchMasteryJson(string paramStr)
        {
            var serializer = new JavaScriptSerializer();
            try
            {
                string[] parts = paramStr.Split('|');
                if (parts.Length < 3)
                {
                    return serializer.Serialize(new Dictionary<string, object> {
                        { "masteryType", "championmastery" },
                        { "error", "Invalid arguments for mastery search" }
                    });
                }

                string gameName = parts[0].Trim();
                string tagLine = parts[1].Trim();
                string region = parts[2].Trim().ToUpperInvariant();

                string riotIdEscaped = Uri.EscapeDataString(gameName + "#" + tagLine);
                string url = "https://championmastery.gg/player?riotId=" + riotIdEscaped + "&region=" + region;

                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                request.Method = "GET";
                request.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
                request.Timeout = 12000;
                request.Proxy = null;
                request.ServicePoint.Expect100Continue = false;

                string html = "";
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                using (Stream stream = response.GetResponseStream())
                using (StreamReader reader = new StreamReader(stream, Encoding.UTF8))
                {
                    html = reader.ReadToEnd();
                }

                var regex = new Regex(@"<a class=""internalLink"" href=""/champion\?champion=(\d+)"">([^<]+)</a></td><td>(\d+)</td><td[^>]*data-value=""(\d+)""", RegexOptions.IgnoreCase);
                var matches = regex.Matches(html);

                var champList = new List<Dictionary<string, object>>();
                int limit = 15;
                int count = 0;
                foreach (Match m in matches)
                {
                    if (count >= limit) break;
                    string cId = m.Groups[1].Value;
                    string cName = m.Groups[2].Value;
                    int cLevel = 0; int.TryParse(m.Groups[3].Value, out cLevel);
                    long cPoints = 0; long.TryParse(m.Groups[4].Value, out cPoints);

                    champList.Add(new Dictionary<string, object>
                    {
                        { "id", cId },
                        { "name", cName },
                        { "level", cLevel },
                        { "points", cPoints }
                    });
                    count++;
                }

                var result = new Dictionary<string, object>
                {
                    { "masteryType", "championmastery" },
                    { "gameName", gameName },
                    { "tagLine", tagLine },
                    { "region", region },
                    { "champions", champList }
                };

                return serializer.Serialize(result);
            }
            catch (Exception ex)
            {
                return serializer.Serialize(new Dictionary<string, object> {
                    { "masteryType", "championmastery" },
                    { "error", "Could not fetch mastery data: " + ex.Message }
                });
            }
        }

        private static bool IsNewerVersion(string latestTag, string currentVersion)
        {
            if (string.IsNullOrEmpty(latestTag)) return false;
            string cleanLatest = latestTag.TrimStart('v', 'V').Trim();
            string cleanCurrent = currentVersion.TrimStart('v', 'V').Trim();

            string[] latestParts = cleanLatest.Split('.');
            string[] currentParts = cleanCurrent.Split('.');

            int maxLen = Math.Max(latestParts.Length, currentParts.Length);
            for (int i = 0; i < maxLen; i++)
            {
                int lVal = 0, cVal = 0;
                if (i < latestParts.Length) int.TryParse(latestParts[i], out lVal);
                if (i < currentParts.Length) int.TryParse(currentParts[i], out cVal);

                if (lVal > cVal) return true;
                if (lVal < cVal) return false;
            }
            return false;
        }

        public static string FetchPatchNotesListJson()
        {
            var serializer = new JavaScriptSerializer();
            serializer.MaxJsonLength = 20971520;
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string cacheDir = Path.Combine(localAppData, "LeagueOfCustoms", "patches");
            if (!Directory.Exists(cacheDir)) Directory.CreateDirectory(cacheDir);
            string cacheFile = Path.Combine(cacheDir, "patch_list.json");

            try
            {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create("https://www.leagueoflegends.com/en-us/news/game-updates/");
                request.Method = "GET";
                request.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
                request.Timeout = 8000;
                request.Proxy = null;
                request.ServicePoint.Expect100Continue = false;

                string html = null;
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                using (Stream stream = response.GetResponseStream())
                using (StreamReader reader = new StreamReader(stream, Encoding.UTF8))
                {
                    html = reader.ReadToEnd();
                }

                if (!string.IsNullOrEmpty(html))
                {
                    Match nextDataMatch = Regex.Match(html, @"<script id=""__NEXT_DATA__""[^>]*>(.*?)</script>", RegexOptions.Singleline);
                    if (nextDataMatch.Success)
                    {
                        var nextJson = serializer.Deserialize<Dictionary<string, object>>(nextDataMatch.Groups[1].Value);
                        if (nextJson != null && nextJson.ContainsKey("props"))
                        {
                            var props = nextJson["props"] as Dictionary<string, object>;
                            var pageProps = props != null && props.ContainsKey("pageProps") ? props["pageProps"] as Dictionary<string, object> : null;
                            var page = pageProps != null && pageProps.ContainsKey("page") ? pageProps["page"] as Dictionary<string, object> : null;
                            var blades = page != null && page.ContainsKey("blades") ? page["blades"] as System.Collections.ArrayList : null;

                            if (blades != null)
                            {
                                var patchList = new List<Dictionary<string, object>>();
                                foreach (var bObj in blades)
                                {
                                    var blade = bObj as Dictionary<string, object>;
                                    if (blade != null && blade.ContainsKey("items") && blade["items"] is System.Collections.ArrayList)
                                    {
                                        var items = blade["items"] as System.Collections.ArrayList;
                                        foreach (var itm in items)
                                        {
                                            var item = itm as Dictionary<string, object>;
                                            if (item == null) continue;
                                            string title = item.ContainsKey("title") && item["title"] != null ? item["title"].ToString() : "";
                                            string titleLower = title.ToLowerInvariant();
                                            if (titleLower.Contains("patch") && titleLower.Contains("notes") && !titleLower.Contains("tft"))
                                            {
                                                string date = item.ContainsKey("publishedAt") && item["publishedAt"] != null ? item["publishedAt"].ToString() : "";
                                                string descText = "";
                                                if (item.ContainsKey("description") && item["description"] != null)
                                                {
                                                    if (item["description"] is string) descText = item["description"].ToString();
                                                    else if (item["description"] is Dictionary<string, object>)
                                                    {
                                                        var dDict = item["description"] as Dictionary<string, object>;
                                                        if (dDict.ContainsKey("body")) descText = dDict["body"].ToString();
                                                        else if (dDict.ContainsKey("text")) descText = dDict["text"].ToString();
                                                    }
                                                }

                                                string imgUrl = "";
                                                if (item.ContainsKey("media") && item["media"] is Dictionary<string, object>)
                                                {
                                                    var m = item["media"] as Dictionary<string, object>;
                                                    if (m.ContainsKey("url") && m["url"] != null) imgUrl = m["url"].ToString();
                                                }
                                                if (string.IsNullOrEmpty(imgUrl) && item.ContainsKey("imageMedia") && item["imageMedia"] is Dictionary<string, object>)
                                                {
                                                    var m = item["imageMedia"] as Dictionary<string, object>;
                                                    if (m.ContainsKey("url") && m["url"] != null) imgUrl = m["url"].ToString();
                                                }

                                                string articleUrl = "";
                                                if (item.ContainsKey("action") && item["action"] is Dictionary<string, object>)
                                                {
                                                    var act = item["action"] as Dictionary<string, object>;
                                                    if (act.ContainsKey("payload") && act["payload"] is Dictionary<string, object>)
                                                    {
                                                        var pld = act["payload"] as Dictionary<string, object>;
                                                        if (pld.ContainsKey("url") && pld["url"] != null) articleUrl = pld["url"].ToString();
                                                    }
                                                }

                                                string patchNum = "";
                                                Match pMatch = Regex.Match(title, @"patch\s+([0-9\.]+)", RegexOptions.IgnoreCase);
                                                if (pMatch.Success) patchNum = pMatch.Groups[1].Value;

                                                patchList.Add(new Dictionary<string, object>
                                                {
                                                    { "title", title },
                                                    { "patch", patchNum },
                                                    { "date", date },
                                                    { "desc", descText },
                                                    { "image", imgUrl },
                                                    { "url", articleUrl }
                                                });
                                            }
                                        }
                                        break;
                                    }
                                }

                                if (patchList.Count > 0)
                                {
                                    var res = new Dictionary<string, object>
                                    {
                                        { "patchNotesType", "patch-list" },
                                        { "success", true },
                                        { "patches", patchList }
                                    };
                                    string jsonOut = serializer.Serialize(res);
                                    try { File.WriteAllText(cacheFile, jsonOut, Encoding.UTF8); } catch { }
                                    return jsonOut;
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                if (File.Exists(cacheFile))
                {
                    try { return File.ReadAllText(cacheFile, Encoding.UTF8); } catch { }
                }
                return serializer.Serialize(new Dictionary<string, object>
                {
                    { "patchNotesType", "patch-list" },
                    { "success", false },
                    { "error", "Failed to fetch patch list: " + ex.Message }
                });
            }

            if (File.Exists(cacheFile))
            {
                try { return File.ReadAllText(cacheFile, Encoding.UTF8); } catch { }
            }

            return serializer.Serialize(new Dictionary<string, object>
            {
                { "patchNotesType", "patch-list" },
                { "success", false },
                { "error", "No patch notes found." }
            });
        }

        public static string FetchPatchDetailJson(string articleUrl)
        {
            var serializer = new JavaScriptSerializer();
            serializer.MaxJsonLength = 20971520;
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string cacheDir = Path.Combine(localAppData, "LeagueOfCustoms", "patches");
            if (!Directory.Exists(cacheDir)) Directory.CreateDirectory(cacheDir);

            string safeId = Regex.Replace(articleUrl, @"[^a-zA-Z0-9_\-]", "_");
            string cacheFile = Path.Combine(cacheDir, safeId + ".json");

            if (File.Exists(cacheFile))
            {
                try { return File.ReadAllText(cacheFile, Encoding.UTF8); } catch { }
            }

            try
            {
                string fullUrl = articleUrl;
                if (!fullUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                {
                    fullUrl = "https://www.leagueoflegends.com" + (articleUrl.StartsWith("/") ? "" : "/") + articleUrl;
                }

                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(fullUrl);
                request.Method = "GET";
                request.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
                request.Timeout = 12000;
                request.Proxy = null;
                request.ServicePoint.Expect100Continue = false;

                string html = null;
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                using (Stream stream = response.GetResponseStream())
                using (StreamReader reader = new StreamReader(stream, Encoding.UTF8))
                {
                    html = reader.ReadToEnd();
                }

                if (!string.IsNullOrEmpty(html))
                {
                    Match nextDataMatch = Regex.Match(html, @"<script id=""__NEXT_DATA__""[^>]*>(.*?)</script>", RegexOptions.Singleline);
                    if (nextDataMatch.Success)
                    {
                        var nextJson = serializer.Deserialize<Dictionary<string, object>>(nextDataMatch.Groups[1].Value);
                        if (nextJson != null && nextJson.ContainsKey("props"))
                        {
                            var props = nextJson["props"] as Dictionary<string, object>;
                            var pageProps = props != null && props.ContainsKey("pageProps") ? props["pageProps"] as Dictionary<string, object> : null;
                            var page = pageProps != null && pageProps.ContainsKey("page") ? pageProps["page"] as Dictionary<string, object> : null;
                            string pageTitle = page != null && page.ContainsKey("title") && page["title"] != null ? page["title"].ToString() : "";
                            var blades = page != null && page.ContainsKey("blades") ? page["blades"] as System.Collections.ArrayList : null;

                            string bodyHtml = "";
                            string heroImg = "";
                            if (blades != null)
                            {
                                foreach (var bObj in blades)
                                {
                                    var blade = bObj as Dictionary<string, object>;
                                    if (blade == null) continue;
                                    string bType = blade.ContainsKey("type") && blade["type"] != null ? blade["type"].ToString() : "";
                                    if (bType == "patchNotesRichText" && blade.ContainsKey("richText") && blade["richText"] is Dictionary<string, object>)
                                    {
                                        var rt = blade["richText"] as Dictionary<string, object>;
                                        if (rt.ContainsKey("body") && rt["body"] != null)
                                        {
                                            bodyHtml = rt["body"].ToString();
                                        }
                                    }
                                    else if (bType == "articleMasthead" && blade.ContainsKey("media") && blade["media"] is Dictionary<string, object>)
                                    {
                                        var m = blade["media"] as Dictionary<string, object>;
                                        if (m.ContainsKey("url") && m["url"] != null) heroImg = m["url"].ToString();
                                    }
                                }
                            }

                            if (!string.IsNullOrEmpty(bodyHtml))
                            {
                                var res = new Dictionary<string, object>
                                {
                                    { "patchNotesType", "patch-detail" },
                                    { "success", true },
                                    { "url", articleUrl },
                                    { "fullUrl", fullUrl },
                                    { "title", pageTitle },
                                    { "heroImage", heroImg },
                                    { "bodyHtml", bodyHtml }
                                };
                                string jsonOut = serializer.Serialize(res);
                                try { File.WriteAllText(cacheFile, jsonOut, Encoding.UTF8); } catch { }
                                return jsonOut;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return serializer.Serialize(new Dictionary<string, object>
                {
                    { "patchNotesType", "patch-detail" },
                    { "success", false },
                    { "url", articleUrl },
                    { "error", "Failed to load patch detail: " + ex.Message }
                });
            }

            return serializer.Serialize(new Dictionary<string, object>
            {
                { "patchNotesType", "patch-detail" },
                { "success", false },
                { "url", articleUrl },
                { "error", "Patch notes content not found." }
            });
        }
    }
}