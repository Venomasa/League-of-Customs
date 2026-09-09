import os
import zipfile
import subprocess

print("=== Building League of Customs Packages ===")

dist_dir = 'dist'
os.makedirs(dist_dir, exist_ok=True)
csc = r'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'

# 1. Compile Uninstall.exe
print("1. Compiling Uninstall.exe...")
res = subprocess.run([
    csc, '/nologo', '/optimize+', '/target:winexe',
    r'/win32icon:assets\app.ico',
    r'/r:System.dll,System.Windows.Forms.dll',
    r'/out:src\Installer\Uninstall.exe',
    r'src\Installer\Uninstall.cs'
])
if res.returncode != 0:
    raise RuntimeError("Failed to compile Uninstall.exe")
print("  -> Uninstall.exe compiled successfully.")

# 2. Build payload.zip for installer
print("2. Packing payload.zip for Setup...")
payload_zip = r'src\Installer\payload.zip'
files_to_pack = [
    ('LeagueOfCustoms.exe', 'LeagueOfCustoms.exe'),
    ('Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.Core.dll'),
    ('Microsoft.Web.WebView2.WinForms.dll', 'Microsoft.Web.WebView2.WinForms.dll'),
    ('WebView2Loader.dll', 'WebView2Loader.dll'),
    (r'src\Installer\Uninstall.exe', 'Uninstall.exe'),
    (r'assets\app.ico', r'assets\app.ico'),
    (r'assets\app.png', r'assets\app.png'),
    (r'README.md', 'README.md')
]

# Add role icons
for icon in os.listdir(r'assets\icons'):
    if icon.endswith('.png'):
        files_to_pack.append((os.path.join(r'assets\icons', icon), os.path.join(r'assets\icons', icon)))

with zipfile.ZipFile(payload_zip, 'w', zipfile.ZIP_DEFLATED) as z:
    for src, arc in files_to_pack:
        z.write(src, arc)
        print(f"  Packed: {arc}")

print(f"  -> payload.zip size: {os.path.getsize(payload_zip):,} bytes")

# 3. Compile Setup.exe
print("3. Compiling LeagueOfCustoms-Setup-v0.1.exe...")
setup_exe = os.path.join(dist_dir, 'LeagueOfCustoms-Setup-v0.1.exe')
res = subprocess.run([
    csc, '/nologo', '/optimize+', '/target:winexe',
    r'/win32icon:assets\app.ico',
    r'/res:src\Installer\payload.zip,payload.zip',
    r'/res:assets\app.ico,app.ico',
    r'/res:assets\app.png,app.png',
    r'/r:System.dll,System.Core.dll,System.Drawing.dll,System.Windows.Forms.dll,System.IO.Compression.dll,System.IO.Compression.FileSystem.dll',
    f'/out:{setup_exe}',
    r'src\Installer\Setup.cs'
])
if res.returncode != 0:
    raise RuntimeError("Failed to compile Setup.exe")
print(f"  -> {setup_exe} built successfully! Size: {os.path.getsize(setup_exe):,} bytes")

# 4. Create Portable zip
print("4. Packaging Portable ZIP...")
portable_zip = os.path.join(dist_dir, 'LeagueOfCustoms-v0.1-Portable.zip')
portable_files = [
    ('LeagueOfCustoms.exe', 'LeagueOfCustoms/LeagueOfCustoms.exe'),
    ('Microsoft.Web.WebView2.Core.dll', 'LeagueOfCustoms/Microsoft.Web.WebView2.Core.dll'),
    ('Microsoft.Web.WebView2.WinForms.dll', 'LeagueOfCustoms/Microsoft.Web.WebView2.WinForms.dll'),
    ('WebView2Loader.dll', 'LeagueOfCustoms/WebView2Loader.dll'),
    ('build_exe.bat', 'LeagueOfCustoms/build_exe.bat'),
    ('README.md', 'LeagueOfCustoms/README.md'),
    (r'assets\app.ico', r'LeagueOfCustoms/assets/app.ico'),
    (r'assets\app.png', r'LeagueOfCustoms/assets/app.png'),
    (r'src\index.html', r'LeagueOfCustoms/src/index.html'),
    (r'src\LeagueOfCustoms.cs', r'LeagueOfCustoms/src/LeagueOfCustoms.cs')
]
for icon in os.listdir(r'assets\icons'):
    if icon.endswith('.png'):
        portable_files.append((os.path.join(r'assets\icons', icon), f'LeagueOfCustoms/assets/icons/{icon}'))

with zipfile.ZipFile(portable_zip, 'w', zipfile.ZIP_DEFLATED) as z:
    for src, arc in portable_files:
        z.write(src, arc)

print(f"  -> {portable_zip} built successfully! Size: {os.path.getsize(portable_zip):,} bytes")

# Clean temp payload.zip
if os.path.exists(payload_zip):
    os.remove(payload_zip)

print("\n=== All Release Packages Ready in dist/ ===")
for f in os.listdir(dist_dir):
    p = os.path.join(dist_dir, f)
    print(f" - {f} ({os.path.getsize(p):,} bytes)")
