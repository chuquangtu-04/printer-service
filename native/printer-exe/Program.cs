using PrinterExe;

const int EXIT_SUCCESS = 0;
const int EXIT_BAD_ARGS = 1;
const int EXIT_FILE_NOT_FOUND = 2;
const int EXIT_PRINT_FAILED = 3;

if (args.Length < 2)
{
    Console.Error.WriteLine("Usage: printer.exe <printerName> <filePath> [docName]");
    return EXIT_BAD_ARGS;
}

string printerName = args[0];
string filePath = args[1];
string docName = args.Length >= 3 ? args[2] : "Raw Print Job";

if (!File.Exists(filePath))
{
    Console.Error.WriteLine($"File not found: {filePath}");
    return EXIT_FILE_NOT_FOUND;
}

try
{
    byte[] data = File.ReadAllBytes(filePath);
    int jobId = RawPrinter.Write(printerName, data, docName);
    Console.WriteLine($"OK JOB_ID={jobId}");
    return EXIT_SUCCESS;
}
catch (PrinterException ex)
{
    Console.Error.WriteLine($"Print failed: {ex.Message}");
    return EXIT_PRINT_FAILED;
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Unexpected error: {ex.Message}");
    return EXIT_PRINT_FAILED;
}
