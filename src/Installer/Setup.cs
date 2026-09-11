using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace LeagueOfCustoms.Installer
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            bool isSilent = false;
            string customDir = "";

            if (args != null)
            {
                for (int i = 0; i < args.Length; i++)
                {
                    string a = args[i].Trim();
                    if (a.Equals("/SILENT", StringComparison.OrdinalIgnoreCase) ||
                        a.Equals("/S", StringComparison.OrdinalIgnoreCase) ||
                        a.Equals("-s", StringComparison.OrdinalIgnoreCase) ||
                        a.Equals("/UPDATE", StringComparison.OrdinalIgnoreCase))
                    {
                        isSilent = true;
                    }
                    else if (a.StartsWith("/DIR=", StringComparison.OrdinalIgnoreCase))
                    {
                        customDir = a.Substring(5).Trim('"', ' ');
                    }
                    else if (a.Equals("/DIR", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                    {
                        customDir = args[++i].Trim('"', ' ');
                    }
                }
            }

            if (isSilent)
            {
                try
                {
                    PerformSilentInstall(customDir);
                }
                catch { }
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SetupForm());
        }

        private static void PerformSilentInstall(string targetDir)
        {
            // 1. Resolve target directory if not specified
            if (string.IsNullOrEmpty(targetDir))
            {
                try
                {
                    using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\LeagueOfCustoms"))
                    {
                        if (key != null)
                        {
                            var loc = key.GetValue("InstallLocation");
                            if (loc != null && !string.IsNullOrEmpty(loc.ToString()))
                                targetDir = loc.ToString();
                        }
                    }
                }
                catch { }
            }

            if (string.IsNullOrEmpty(targetDir))
            {
                targetDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "LeagueOfCustoms");
            }

            // 2. Kill existing LeagueOfCustoms processes
            for (int k = 0; k < 10; k++)
            {
                var procs = Process.GetProcessesByName("LeagueOfCustoms");
                if (procs.Length == 0) break;
                foreach (var p in procs)
                {
                    try { p.Kill(); p.WaitForExit(1500); } catch { }
                }
                Thread.Sleep(300);
            }

            Directory.CreateDirectory(targetDir);

            // 3. Extract embedded payload.zip
            var asm = Assembly.GetExecutingAssembly();
            string tempZip = Path.Combine(Path.GetTempPath(), "LoC_Payload_" + Guid.NewGuid().ToString("N") + ".zip");
            using (var res = asm.GetManifestResourceStream("payload.zip"))
            {
                if (res == null) return;
                using (var fs = new FileStream(tempZip, FileMode.Create, FileAccess.Write))
                {
                    res.CopyTo(fs);
                }
            }

            using (var archive = ZipFile.OpenRead(tempZip))
            {
                foreach (var entry in archive.Entries)
                {
                    if (string.IsNullOrEmpty(entry.Name))
                    {
                        Directory.CreateDirectory(Path.Combine(targetDir, entry.FullName));
                        continue;
                    }
                    string destFile = Path.Combine(targetDir, entry.FullName);
                    string destDir = Path.GetDirectoryName(destFile);
                    if (!Directory.Exists(destDir)) Directory.CreateDirectory(destDir);
                    entry.ExtractToFile(destFile, true);
                }
            }
            try { File.Delete(tempZip); } catch { }

            // 4. Update shortcuts
            string exePath = Path.Combine(targetDir, "LeagueOfCustoms.exe");
            string iconPath = Path.Combine(targetDir, @"assets\app.ico");
            if (!File.Exists(iconPath)) iconPath = exePath;

            try
            {
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                SetupForm.CreateShortcutHelper(Path.Combine(desktop, "League of Customs.lnk"), exePath, targetDir, iconPath);

                string startMenu = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                string appFolder = Path.Combine(startMenu, "League of Customs");
                Directory.CreateDirectory(appFolder);
                SetupForm.CreateShortcutHelper(Path.Combine(appFolder, "League of Customs.lnk"), exePath, targetDir, iconPath);
                SetupForm.CreateShortcutHelper(Path.Combine(appFolder, "Uninstall League of Customs.lnk"), Path.Combine(targetDir, "Uninstall.exe"), targetDir, iconPath);
            }
            catch { }

            // 5. Register in Add/Remove Programs
            SetupForm.RegisterUninstallHelper(targetDir, exePath, iconPath);

            // 6. Launch the updated executable
            if (File.Exists(exePath))
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = exePath,
                    WorkingDirectory = targetDir,
                    UseShellExecute = true
                });
            }
        }
    }

    public class SetupForm : Form
    {
        private TextBox _txtPath;
        private CheckBox _chkDesktop;
        private CheckBox _chkStartMenu;
        private CheckBox _chkLaunch;
        private Button _btnInstall;
        private Button _btnBrowse;
        private ProgressBar _progBar;
        private Label _lblStatus;
        private bool _isCompleted = false;

        public SetupForm()
        {
            this.Text = "League of Customs v0.4 Setup";
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.ClientSize = new Size(580, 430);
            this.BackColor = Color.FromArgb(1, 10, 19);
            this.ForeColor = Color.FromArgb(240, 230, 211);
            this.Font = new Font("Segoe UI", 9.25f, FontStyle.Regular);

            try
            {
                var asm = Assembly.GetExecutingAssembly();
                using (var s = asm.GetManifestResourceStream("app.ico"))
                {
                    if (s != null) this.Icon = new Icon(s);
                }
            }
            catch { }

            BuildUI();
        }

        private void BuildUI()
        {
            // Header panel
            Panel pnlHeader = new Panel
            {
                Dock = DockStyle.Top,
                Height = 84,
                BackColor = Color.FromArgb(10, 20, 40)
            };
            pnlHeader.Paint += delegate(object s, PaintEventArgs e)
            {
                using (var pen = new Pen(Color.FromArgb(200, 155, 60), 1))
                {
                    e.Graphics.DrawLine(pen, 0, pnlHeader.Height - 1, pnlHeader.Width, pnlHeader.Height - 1);
                }
            };

            PictureBox picLogo = new PictureBox
            {
                Size = new Size(56, 56),
                Location = new Point(20, 14),
                SizeMode = PictureBoxSizeMode.Zoom
            };
            try
            {
                var asm = Assembly.GetExecutingAssembly();
                using (var s = asm.GetManifestResourceStream("app.png"))
                {
                    if (s != null) picLogo.Image = Image.FromStream(s);
                }
            }
            catch { }

            Label lblTitle = new Label
            {
                Text = "LEAGUE OF CUSTOMS",
                Font = new Font("Segoe UI", 13.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(200, 155, 60),
                Location = new Point(88, 16),
                AutoSize = true
            };

            Label lblSub = new Label
            {
                Text = "Version v0.4 — Custom Game Companion & Team Randomizer",
                Font = new Font("Segoe UI", 8.75f, FontStyle.Regular),
                ForeColor = Color.FromArgb(160, 155, 140),
                Location = new Point(90, 44),
                AutoSize = true
            };

            pnlHeader.Controls.Add(picLogo);
            pnlHeader.Controls.Add(lblTitle);
            pnlHeader.Controls.Add(lblSub);
            this.Controls.Add(pnlHeader);

            // Check for existing installation (Upgrade / Update detection)
            string existingPath = null;
            string existingVer = null;
            try
            {
                using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\LeagueOfCustoms"))
                {
                    if (key != null)
                    {
                        existingPath = key.GetValue("InstallLocation") as string;
                        existingVer = key.GetValue("DisplayVersion") as string;
                    }
                }
            }
            catch { }

            string defaultPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                @"Programs\LeagueOfCustoms"
            );

            bool isUpgrade = false;
            if (!string.IsNullOrEmpty(existingPath) && Directory.Exists(existingPath))
            {
                defaultPath = existingPath;
                isUpgrade = true;
            }
            else if (File.Exists(Path.Combine(defaultPath, "LeagueOfCustoms.exe")))
            {
                isUpgrade = true;
            }

            if (isUpgrade)
            {
                this.Text = "League of Customs v0.4 Update";
                lblTitle.Text = "UPDATE LEAGUE OF CUSTOMS";
                lblSub.Text = string.Format("Upgrade existing installation{0} to Version v0.4", string.IsNullOrEmpty(existingVer) ? "" : " (v" + existingVer + ")");
            }

            // Install Location Group
            Label lblDest = new Label
            {
                Text = isUpgrade ? "Installation to Update:" : "Destination Folder:",
                Location = new Point(28, 106),
                AutoSize = true,
                ForeColor = Color.FromArgb(200, 155, 60),
                Font = new Font("Segoe UI", 9.25f, FontStyle.Bold)
            };
            this.Controls.Add(lblDest);

            _txtPath = new TextBox
            {
                Text = defaultPath,
                Location = new Point(30, 130),
                Width = 410,
                Height = 26,
                BackColor = Color.FromArgb(15, 25, 35),
                ForeColor = Color.FromArgb(240, 230, 211),
                BorderStyle = BorderStyle.FixedSingle
            };
            this.Controls.Add(_txtPath);

            _btnBrowse = new Button
            {
                Text = "Browse...",
                Location = new Point(452, 128),
                Width = 96,
                Height = 28,
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(20, 30, 45),
                ForeColor = Color.FromArgb(200, 155, 60),
                Cursor = Cursors.Hand
            };
            _btnBrowse.FlatAppearance.BorderColor = Color.FromArgb(120, 90, 40);
            _btnBrowse.Click += delegate
            {
                using (var fbd = new FolderBrowserDialog())
                {
                    fbd.SelectedPath = _txtPath.Text;
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        _txtPath.Text = Path.Combine(fbd.SelectedPath, "LeagueOfCustoms");
                    }
                }
            };
            this.Controls.Add(_btnBrowse);

            // Options Checkboxes
            _chkDesktop = new CheckBox
            {
                Text = "Create a Desktop shortcut",
                Location = new Point(30, 178),
                AutoSize = true,
                Checked = true,
                ForeColor = Color.FromArgb(240, 230, 211)
            };
            this.Controls.Add(_chkDesktop);

            _chkStartMenu = new CheckBox
            {
                Text = "Create a Start Menu shortcut",
                Location = new Point(30, 206),
                AutoSize = true,
                Checked = true,
                ForeColor = Color.FromArgb(240, 230, 211)
            };
            this.Controls.Add(_chkStartMenu);

            _chkLaunch = new CheckBox
            {
                Text = "Launch League of Customs when setup finishes",
                Location = new Point(30, 234),
                AutoSize = true,
                Checked = true,
                ForeColor = Color.FromArgb(240, 230, 211)
            };
            this.Controls.Add(_chkLaunch);

            // Progress Bar & Status
            _lblStatus = new Label
            {
                Text = isUpgrade ? "Existing installation detected. Click 'Update' to upgrade to v0.4." : "Ready to install. Click 'Install' to begin.",
                Location = new Point(30, 276),
                AutoSize = true,
                ForeColor = Color.FromArgb(160, 155, 140)
            };
            this.Controls.Add(_lblStatus);

            _progBar = new ProgressBar
            {
                Location = new Point(30, 302),
                Width = 518,
                Height = 18,
                Style = ProgressBarStyle.Blocks,
                Value = 0
            };
            this.Controls.Add(_progBar);

            // Action Buttons
            Panel pnlBottom = new Panel
            {
                Dock = DockStyle.Bottom,
                Height = 60,
                BackColor = Color.FromArgb(10, 16, 26)
            };
            pnlBottom.Paint += delegate(object s, PaintEventArgs e)
            {
                using (var pen = new Pen(Color.FromArgb(120, 90, 40), 1))
                {
                    e.Graphics.DrawLine(pen, 0, 0, pnlBottom.Width, 0);
                }
            };

            _btnInstall = new Button
            {
                Text = isUpgrade ? "Update" : "Install",
                Location = new Point(356, 14),
                Width = 100,
                Height = 32,
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(200, 155, 60),
                ForeColor = Color.FromArgb(1, 10, 19),
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            _btnInstall.FlatAppearance.BorderSize = 0;
            _btnInstall.Click += BtnInstall_Click;
            pnlBottom.Controls.Add(_btnInstall);

            Button btnCancel = new Button
            {
                Text = "Cancel",
                Location = new Point(466, 14),
                Width = 84,
                Height = 32,
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(20, 28, 38),
                ForeColor = Color.FromArgb(160, 155, 140),
                Cursor = Cursors.Hand
            };
            btnCancel.FlatAppearance.BorderColor = Color.FromArgb(70, 70, 75);
            btnCancel.Click += delegate { this.Close(); };
            pnlBottom.Controls.Add(btnCancel);

            this.Controls.Add(pnlBottom);
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            if (_isCompleted)
            {
                if (_chkLaunch.Checked)
                {
                    try
                    {
                        string exe = Path.Combine(_txtPath.Text, "LeagueOfCustoms.exe");
                        if (File.Exists(exe)) Process.Start(exe);
                    }
                    catch { }
                }
                this.Close();
                return;
            }

            string targetDir = _txtPath.Text.Trim();
            if (string.IsNullOrEmpty(targetDir))
            {
                MessageBox.Show("Please specify a valid destination folder.", "Invalid Path", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            _btnInstall.Enabled = false;
            _btnBrowse.Enabled = false;
            _txtPath.Enabled = false;
            _chkDesktop.Enabled = false;
            _chkStartMenu.Enabled = false;
            _progBar.Value = 10;
            _lblStatus.Text = "Closing any running instances...";

            ThreadPool.QueueUserWorkItem(delegate
            {
                try
                {
                    // 1. Close running instances
                    foreach (var p in Process.GetProcessesByName("LeagueOfCustoms"))
                    {
                        try { p.Kill(); p.WaitForExit(3000); } catch { }
                    }

                    UpdateStatus(30, "Extracting application files...");
                    Directory.CreateDirectory(targetDir);

                    // 2. Extract embedded payload
                    var asm = Assembly.GetExecutingAssembly();
                    string tempZip = Path.Combine(Path.GetTempPath(), "LoC_Payload_" + Guid.NewGuid().ToString("N") + ".zip");
                    using (var res = asm.GetManifestResourceStream("payload.zip"))
                    {
                        if (res == null) throw new Exception("Embedded payload not found in setup executable.");
                        using (var fs = new FileStream(tempZip, FileMode.Create, FileAccess.Write))
                        {
                            res.CopyTo(fs);
                        }
                    }

                    // Extract zip entries (overwriting existing)
                    using (var archive = ZipFile.OpenRead(tempZip))
                    {
                        int count = 0;
                        int total = archive.Entries.Count;
                        foreach (var entry in archive.Entries)
                        {
                            if (string.IsNullOrEmpty(entry.Name))
                            {
                                // Directory entry
                                string dir = Path.Combine(targetDir, entry.FullName);
                                Directory.CreateDirectory(dir);
                                continue;
                            }

                            string destFile = Path.Combine(targetDir, entry.FullName);
                            string destDir = Path.GetDirectoryName(destFile);
                            if (!Directory.Exists(destDir)) Directory.CreateDirectory(destDir);

                            entry.ExtractToFile(destFile, true);
                            count++;
                            int progress = 30 + (int)((count / (float)total) * 45);
                            UpdateStatus(progress, "Extracting: " + entry.Name);
                        }
                    }

                    try { File.Delete(tempZip); } catch { }

                    // 3. Create shortcuts
                    UpdateStatus(80, "Creating shortcuts...");
                    string exePath = Path.Combine(targetDir, "LeagueOfCustoms.exe");
                    string iconPath = Path.Combine(targetDir, @"assets\app.ico");
                    if (!File.Exists(iconPath)) iconPath = exePath;

                    if (_chkDesktop.Checked)
                    {
                        string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                        CreateShortcut(Path.Combine(desktop, "League of Customs.lnk"), exePath, targetDir, iconPath);
                    }

                    if (_chkStartMenu.Checked)
                    {
                        string startMenu = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                        string appFolder = Path.Combine(startMenu, "League of Customs");
                        Directory.CreateDirectory(appFolder);
                        CreateShortcut(Path.Combine(appFolder, "League of Customs.lnk"), exePath, targetDir, iconPath);
                        CreateShortcut(Path.Combine(appFolder, "Uninstall League of Customs.lnk"), Path.Combine(targetDir, "Uninstall.exe"), targetDir, iconPath);
                    }

                    // 4. Register in Add/Remove Programs
                    UpdateStatus(92, "Registering application...");
                    RegisterUninstall(targetDir, exePath, iconPath);

                    // 5. Complete
                    UpdateStatus(100, "Installation complete!");
                    this.Invoke((Action)delegate
                    {
                        _isCompleted = true;
                        _btnInstall.Text = "Finish";
                        _btnInstall.Enabled = true;
                    });
                }
                catch (Exception ex)
                {
                    this.Invoke((Action)delegate
                    {
                        _lblStatus.Text = "Error: " + ex.Message;
                        _lblStatus.ForeColor = Color.FromArgb(232, 64, 87);
                        _btnInstall.Enabled = true;
                        MessageBox.Show("Installation failed: " + ex.Message, "Setup Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    });
                }
            });
        }

        private void UpdateStatus(int progress, string msg)
        {
            this.Invoke((Action)delegate
            {
                _progBar.Value = Math.Min(100, Math.Max(0, progress));
                _lblStatus.Text = msg;
            });
        }

        private void CreateShortcut(string shortcutPath, string targetPath, string workingDir, string iconPath)
        {
            CreateShortcutHelper(shortcutPath, targetPath, workingDir, iconPath);
        }

        public static void CreateShortcutHelper(string shortcutPath, string targetPath, string workingDir, string iconPath)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = targetPath;
                shortcut.WorkingDirectory = workingDir;
                shortcut.IconLocation = iconPath;
                shortcut.Description = "League of Customs - Companion & Custom Match Team Randomizer";
                shortcut.Save();
            }
            catch { }
        }

        private void RegisterUninstall(string installDir, string exePath, string iconPath)
        {
            RegisterUninstallHelper(installDir, exePath, iconPath);
        }

        public static void RegisterUninstallHelper(string installDir, string exePath, string iconPath)
        {
            try
            {
                using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\LeagueOfCustoms"))
                {
                    if (key != null)
                    {
                        key.SetValue("DisplayName", "League of Customs");
                        key.SetValue("DisplayVersion", "0.4");
                        key.SetValue("Publisher", "Venomasa");
                        key.SetValue("DisplayIcon", iconPath);
                        key.SetValue("InstallLocation", installDir);
                        key.SetValue("UninstallString", string.Format("\"{0}\"", Path.Combine(installDir, "Uninstall.exe")));
                        key.SetValue("NoModify", 1, RegistryValueKind.DWord);
                        key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                    }
                }
            }
            catch { }
        }
    }
}
