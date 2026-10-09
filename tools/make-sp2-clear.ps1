Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class SplashKeyer2 {
  static double Clamp01(double v) {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  }

  public static void KeySky(string srcPath, string dstPath) {
    using (var src = new Bitmap(srcPath)) {
      var rect = new Rectangle(0, 0, src.Width, src.Height);
      var srcData = src.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      using (var dst = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb)) {
        var dstData = dst.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        int bytes = Math.Abs(srcData.Stride) * src.Height;
        byte[] buf = new byte[bytes];
        Marshal.Copy(srcData.Scan0, buf, 0, bytes);
        src.UnlockBits(srcData);

        for (int i = 0; i < buf.Length; i += 4) {
          double b = buf[i];
          double g = buf[i + 1];
          double r = buf[i + 2];
          double max = Math.Max(r, Math.Max(g, b));
          double min = Math.Min(r, Math.Min(g, b));
          double sat = max <= 1 ? 0 : (max - min) / max;
          double lum = (r + g + b) / 3.0;
          double sky = 0;

          // Soft studio sky / paper backdrop (near-white / cool gray)
          if (lum > 150 && sat < 0.18) {
            sky = Clamp01((lum - 150) / 28.0) * Clamp01((0.18 - sat) / 0.18);
          }
          if (r > 150 && g > 150 && b > 150 && (max - min) < 36) {
            double graySky = Clamp01((lum - 150) / 30.0);
            if (graySky > sky) sky = graySky;
          }
          // Hard kill remaining pale neutrals
          if (lum > 175 && sat < 0.10) sky = 1.0;
          if (r > 175 && g > 175 && b > 175 && (max - min) < 22) sky = 1.0;

          double blueBias = b - r;
          if (blueBias > 22 && b > 110 && sat > 0.10) {
            sky *= Clamp01(1.0 - ((blueBias - 22) / 40.0));
          }
          // Keep saturated cyan/blue water even if bright
          if (sat > 0.18 && blueBias > 30) sky = 0;

          int a = (int)Math.Round(255 * (1.0 - sky));
          if (a < 18) a = 0;
          buf[i + 3] = (byte)a;
        }

        Marshal.Copy(buf, 0, dstData.Scan0, bytes);
        dst.UnlockBits(dstData);
        dst.Save(dstPath, ImageFormat.Png);
      }
    }
  }
}
"@

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -ErrorAction SilentlyContinue
# Script lives in tools/; project root is parent of tools
$proj = Split-Path $PSScriptRoot -Parent
$src = Join-Path $proj 'assets\images\water\splash\sp2.png'
$dst = Join-Path $proj 'assets\images\water\splash\sp2-clear.png'
[SplashKeyer2]::KeySky($src, $dst)

Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile($dst)
$c = $img.GetPixel(10,10)
Write-Host ("corner A={0} RGB={1},{2},{3}" -f $c.A,$c.R,$c.G,$c.B)
$cx = [int]($img.Width/2)
$c = $img.GetPixel($cx, [int]($img.Height*0.55))
Write-Host ("crown A={0} RGB={1},{2},{3}" -f $c.A,$c.R,$c.G,$c.B)
$c = $img.GetPixel($cx, [int]($img.Height*0.78))
Write-Host ("base A={0} RGB={1},{2},{3}" -f $c.A,$c.R,$c.G,$c.B)
$img.Dispose()
Write-Host "saved $dst"
