using System.ComponentModel;
using System.Runtime.InteropServices;

namespace PrinterExe;

[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
public struct DOC_INFO_1
{
    [MarshalAs(UnmanagedType.LPWStr)] public string? pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string? pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string? pDataType;
}

public static class RawPrinter
{
    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int StartDocPrinter(IntPtr hPrinter, int level, ref DOC_INFO_1 pDocInfo);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

    public static int Write(string printerName, byte[] data, string docName = "Raw Print Job")
    {
        IntPtr hPrinter = IntPtr.Zero;

        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
        {
            throw PrinterException.FromLastWin32Error($"OpenPrinter failed for '{printerName}'");
        }

        try
        {
            var docInfo = new DOC_INFO_1
            {
                pDocName = docName,
                pOutputFile = null,
                pDataType = "RAW",
            };

            int jobId = StartDocPrinter(hPrinter, 1, ref docInfo);
            if (jobId <= 0)
            {
                throw PrinterException.FromLastWin32Error("StartDocPrinter failed");
            }

            try
            {
                if (!StartPagePrinter(hPrinter))
                {
                    throw PrinterException.FromLastWin32Error("StartPagePrinter failed");
                }

                try
                {
                    if (!WritePrinter(hPrinter, data, data.Length, out int written))
                    {
                        throw PrinterException.FromLastWin32Error("WritePrinter failed");
                    }

                    if (written != data.Length)
                    {
                        throw new PrinterException($"Only wrote {written}/{data.Length} bytes");
                    }
                }
                finally
                {
                    EndPagePrinter(hPrinter);
                }
            }
            finally
            {
                EndDocPrinter(hPrinter);
            }

            return jobId;
        }
        finally
        {
            ClosePrinter(hPrinter);
        }
    }
}

public class PrinterException : Exception
{
    public int? Win32ErrorCode { get; }

    public PrinterException(string message, int? win32ErrorCode = null)
        : base(win32ErrorCode.HasValue ? $"{message} (Win32 error {win32ErrorCode}: {new Win32Exception(win32ErrorCode.Value).Message})" : message)
    {
        Win32ErrorCode = win32ErrorCode;
    }

    public static PrinterException FromLastWin32Error(string message)
    {
        return new PrinterException(message, Marshal.GetLastWin32Error());
    }
}
