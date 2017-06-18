param (
    [string]$Folder = $(Read-Host "Root folder: "),
    [string]$MusicDb = $(Read-Host "Music db: "),
    [string]$Visualizer = $(Read-Host "Visualizer cmd: "),
    [bool]$KeepJson = $False
)

$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
#$Folder = "D:\Develop\Temporary Data\bang\musicscore"
#$MusicDb = "D:\Develop\Temporary Data\bang\musics.json"
#$Visualizer = "D:\Develop\Toys\BandoriScore\BandoriScoreVisualizer\bin\Release\BandoriScoreVisualizer.exe"

cd $PSScriptRoot

$root = New-Object System.IO.DirectoryInfo -ArgumentList $Folder
$regex = New-Object System.Text.RegularExpressions.Regex -ArgumentList "([^_]+)\.txt$"

ForEach ($di in $root.GetDirectories()) {
    $musicId = $di.Name
    ForEach ($fi in $di.GetFiles("*.txt")) {
        Write-Host $musicId $fi.Name
        $name = $fi.Name;
        $diff = $regex.Match($name).Groups[1].Value
        if ($diff -eq "command") {
            continue
        }

        $fullName = $fi.FullName
        $jsonName = $fi.FullName.Replace(".txt", ".json")
        $pngName = $fi.FullName.Replace(".txt", ".png")
        #fuck powershell encoding
        #Get-Content $fi.FullName | node.exe ..\parser.js -m $MusicDb -d $diff -i $musicId > $jsonName
        cmd /c "node ..\parser.js -m `"$MusicDb`" -d $diff -i $musicId < `"$fullName`" > `"$jsonName`""

        & $Visualizer $jsonName $pngName
        if (-Not $KeepJson) {
            Remove-Item $jsonName
        }
    }
}
