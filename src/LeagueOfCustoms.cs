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

            this.Text = "League of Customs v0.2";
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

                // Build JSON-RPC payload
                var rpcParams = new Dictionary<string, object>
                {
                    { "name", "lol_get_summoner_profile" },
                    { "arguments", new Dictionary<string, object> {
                        { "game_name", gameName },
                        { "tag_line", tagLine },
                        { "region", region }
                    }}
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
                request.UserAgent = "LeagueOfCustoms/0.2";
                request.Timeout = 15000;
                request.ContentLength = bodyBytes.Length;

                using (Stream stream = request.GetRequestStream())
                {
                    stream.Write(bodyBytes, 0, bodyBytes.Length);
                }

                string responseText = null;
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                using (StreamReader reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8))
                {
                    responseText = reader.ReadToEnd();
                }

                if (string.IsNullOrEmpty(responseText))
                {
                    return serializer.Serialize(new Dictionary<string, object> {
                        { "profileType", "opgg" },
                        { "error", "Empty response from OP.GG API." }
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
                int limit = 10;
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
    }
}