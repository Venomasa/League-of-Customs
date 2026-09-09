using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
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
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
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

            this.Text = "League of Customs v0.1";
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
                string userDataFolder = Path.Combine(Path.GetTempPath(), "LeagueOfCustoms_WV2");
                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                await _webView.EnsureCoreWebView2Async(env);

                _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                _webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
                _webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;

                _webView.CoreWebView2.NewWindowRequested += delegate (object s, CoreWebView2NewWindowRequestedEventArgs args)
                {
                    args.Handled = true;
                    try
                    {
                        Process.Start(new ProcessStartInfo(args.Uri) { UseShellExecute = true });
                    }
                    catch { }
                };

                _webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;

                string localPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "src", "index.html");
                if (!File.Exists(localPath))
                {
                    localPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "index.html");
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

                string lockContent = File.ReadAllText(lockfile);
                string[] parts = lockContent.Split(':');
                if (parts.Length < 4)
                {
                    return serializer.Serialize(new { error = "Invalid lockfile format." });
                }

                int lcuPort = int.Parse(parts[2]);
                string lcuPass = parts[3];

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
                            if (item is Dictionary<string, object>)
                            {
                                var m = (Dictionary<string, object>)item;
                                string sName = m.ContainsKey("summonerName") && m["summonerName"] != null ? m["summonerName"].ToString() : "";
                                string gName = m.ContainsKey("gameName") && m["gameName"] != null ? m["gameName"].ToString() : "";
                                string gTag = m.ContainsKey("gameNameTag") && m["gameNameTag"] != null ? m["gameNameTag"].ToString() : "";

                                if (!string.IsNullOrEmpty(sName))
                                {
                                    members.Add(sName);
                                }
                                else if (!string.IsNullOrEmpty(gName))
                                {
                                    string full = string.IsNullOrEmpty(gTag) ? gName : (gName + " #" + gTag);
                                    members.Add(full);
                                }
                                else
                                {
                                    members.Add("Unknown");
                                }
                            }
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

        private static string FindLockfile()
        {
            try
            {
                Process[] procs = Process.GetProcessesByName("LeagueClient");
                if (procs.Length == 0) procs = Process.GetProcessesByName("LeagueClientUx");
                if (procs.Length > 0)
                {
                    string pPath = procs[0].MainModule.FileName;
                    string pDir = Path.GetDirectoryName(pPath);
                    string lf = Path.Combine(pDir, "lockfile");
                    if (File.Exists(lf)) return lf;
                }
            }
            catch { }

            string[] candidates = new string[]
            {
                @"C:\Riot Games\League of Legends\lockfile",
                @"D:\Riot Games\League of Legends\lockfile",
                @"E:\Riot Games\League of Legends\lockfile",
                @"F:\Riot Games\League of Legends\lockfile",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Riot Games\League of Legends\lockfile"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Riot Games\League of Legends\lockfile"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Riot Games\League of Legends\lockfile")
            };

            foreach (string p in candidates)
            {
                if (File.Exists(p)) return p;
            }

            try
            {
                using (var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Riot Games, Inc\League of Legends"))
                {
                    if (key != null)
                    {
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

            return null;
        }
    }
}