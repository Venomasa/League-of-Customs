using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using Microsoft.Win32;

namespace LeagueOfCustoms.Installer
{
    static class Uninstaller
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            var result = MessageBox.Show(
                "Are you sure you want to uninstall League of Customs?",
                "Uninstall League of Customs",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question);

            if (result != DialogResult.Yes) return;

            try
            {
                // Close running instance
                foreach (var p in Process.GetProcessesByName("LeagueOfCustoms"))
                {
                    try { p.Kill(); p.WaitForExit(3000); } catch { }
                }

                // Remove Desktop shortcut
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string deskShortcut = Path.Combine(desktop, "League of Customs.lnk");
                if (File.Exists(deskShortcut)) File.Delete(deskShortcut);

                // Remove Start Menu shortcut
                string startMenu = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                string appStartFolder = Path.Combine(startMenu, "League of Customs");
                if (Directory.Exists(appStartFolder))
                {
                    Directory.Delete(appStartFolder, true);
                }

                // Remove registry entry
                try
                {
                    using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall", true))
                    {
                        if (key != null)
                        {
                            key.DeleteSubKeyTree("LeagueOfCustoms", false);
                        }
                    }
                }
                catch { }

                // Self-delete install directory via cmd
                string installDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
                string cmd = string.Format("/C timeout /t 1 /nobreak > NUL & rd /s /q \"{0}\"", installDir);
                Process.Start(new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = cmd,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    CreateNoWindow = true
                });

                MessageBox.Show(
                    "League of Customs has been successfully uninstalled from your computer.",
                    "Uninstall Complete",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("An error occurred during uninstallation: " + ex.Message, "Uninstall Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
