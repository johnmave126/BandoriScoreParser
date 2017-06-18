param (
    [string]$Folder = $(Read-Host "Root folder: "),
    [string]$MusicDb = $(Read-Host "Music db: "),
    [string]$Visualizer = $(Read-Host "Visualizer cmd: ")
)

$Folder = "D:\Develop\Temporary Data\bang\musicscore"
$MusicDb = "D:\Develop\Temporary Data\bang\musics.json"
$Visualizer = "D:\Develop\Toys\BandoriScore\BandoriScoreVisualizer\bin\Release\BandoriScoreVisualizer.exe"

cd $PSScriptRoot

$root = New-Object System.IO.DirectoryInfo -ArgumentList $Folder
$regex = New-Object System.Text.RegularExpressions.Regex -ArgumentList "([^_]+)\.txt$"

ForEach ($di in $root.GetDirectories()) {
    ForEach ($fi in $di.GetFiles("*.txt")) {
        Write-Host $fi.Name
        $name = $fi.Name;
        $diff = $regex.Match($name).Groups[1].Value
        if ($diff -eq "command") {
            continue
        }

        $jsonName = $fi.FullName.Replace(".txt", ".json")
        $pngName = $fi.FullName.Replace(".txt", ".png")
        Get-Content $fi.FullName | node.exe ..\parser.js -m $MusicDb -d $diff > $jsonName
        & $Visualizer $jsonName $pngName
        Remove-Item $jsonName
    }
}
