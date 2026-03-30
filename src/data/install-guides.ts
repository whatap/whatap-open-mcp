// src/data/install-guides.ts
// AUTO-GENERATED from WhaTap install page scraping (2026-03-30).
// Install command templates for each platform × OS variant.
// Placeholders: {accesskey}, {server_host}, {server_port}

export interface InstallStep {
  title: string;
  commands: string[];
  description?: string;
}

export interface OsInstallGuide {
  os: string;
  configPath: string;
  packageName: string;
  steps: InstallStep[];
}

export interface PlatformInstallGuide {
  platform: string;
  agentType: string;
  description: string;
  osVariants?: OsInstallGuide[];
  /** For platforms without OS variants (APM, DB, etc.) */
  steps?: InstallStep[];
  notes?: string[];
}

// ─── INFRA (Server Monitoring) ───────────────────────────────────

const INFRA_CONFIG_STEP: InstallStep = {
  title: "Configure and start agent",
  commands: [
    'echo "license={accesskey}" | sudo tee /usr/whatap/infra/conf/whatap.conf',
    'echo "whatap.server.host={server_host}" | sudo tee -a /usr/whatap/infra/conf/whatap.conf',
    'echo "createdtime=$(date +%s%N)" | sudo tee -a /usr/whatap/infra/conf/whatap.conf',
    'sudo service whatap-infra restart',
  ],
};

const INFRA_GUIDE: PlatformInstallGuide = {
  platform: "INFRA",
  agentType: "whatap-infra",
  description: "WhaTap server infrastructure monitoring agent",
  osVariants: [
    {
      os: "Debian/Ubuntu",
      configPath: "/usr/whatap/infra/conf/whatap.conf",
      packageName: "whatap-infra",
      steps: [
        {
          title: "Add WhaTap repository",
          commands: [
            'curl -s https://repo.whatap.io/debian/release.gpg | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/whatap-release.gpg > /dev/null',
            'echo "deb [signed-by=/etc/apt/trusted.gpg.d/whatap-release.gpg] https://repo.whatap.io/debian unstable/" | sudo tee /etc/apt/sources.list.d/whatap.list',
            'sudo apt-get update',
          ],
        },
        {
          title: "Install agent",
          commands: ['sudo apt-get install -y whatap-infra'],
        },
        INFRA_CONFIG_STEP,
      ],
    },
    {
      os: "Amazon Linux",
      configPath: "/usr/whatap/infra/conf/whatap.conf",
      packageName: "whatap-infra",
      steps: [
        {
          title: "Add WhaTap repository",
          commands: [
            'sudo rpm --import https://repo.whatap.io/centos/release.gpg',
            'echo "[whatap]" | sudo tee /etc/yum.repos.d/whatap.repo > /dev/null',
            'echo "name=whatap packages for enterprise linux" | sudo tee -a /etc/yum.repos.d/whatap.repo > /dev/null',
            'echo "baseurl=https://repo.whatap.io/centos/latest/\\$basearch" | sudo tee -a /etc/yum.repos.d/whatap.repo > /dev/null',
            'echo "enabled=1" | sudo tee -a /etc/yum.repos.d/whatap.repo > /dev/null',
            'echo "gpgcheck=0" | sudo tee -a /etc/yum.repos.d/whatap.repo > /dev/null',
          ],
        },
        {
          title: "Install agent",
          commands: ['sudo yum install -y whatap-infra'],
        },
        INFRA_CONFIG_STEP,
      ],
    },
    {
      os: "RHEL/CentOS/Rocky Linux/Oracle Linux/Fedora",
      configPath: "/usr/whatap/infra/conf/whatap.conf",
      packageName: "whatap-infra",
      steps: [
        {
          title: "Add WhaTap repository",
          commands: [
            'sudo rpm --import https://repo.whatap.io/centos/release.gpg',
            'sudo rpm -Uvh https://repo.whatap.io/centos/5/noarch/whatap-repo-1.0-1.noarch.rpm',
          ],
        },
        {
          title: "Install agent",
          commands: ['sudo yum install -y whatap-infra'],
        },
        INFRA_CONFIG_STEP,
      ],
    },
    {
      os: "SUSE",
      configPath: "/usr/whatap/infra/conf/whatap.conf",
      packageName: "whatap-infra",
      steps: [
        {
          title: "Add WhaTap repository",
          commands: [
            'sudo rpm --import https://repo.whatap.io/suse/release.gpg',
            'echo "[whatap]" | sudo tee /etc/zypp/repos.d/whatap.repo > /dev/null',
            'echo "name=whatap packages for enterprise linux" | sudo tee -a /etc/zypp/repos.d/whatap.repo > /dev/null',
            'echo "baseurl=https://repo.whatap.io/suse/12/x86_64" | sudo tee -a /etc/zypp/repos.d/whatap.repo > /dev/null',
            'echo "enabled=1" | sudo tee -a /etc/zypp/repos.d/whatap.repo > /dev/null',
            'echo "gpgcheck=1" | sudo tee -a /etc/zypp/repos.d/whatap.repo > /dev/null',
            'sudo zypper refresh',
          ],
        },
        {
          title: "Install agent",
          commands: ['sudo zypper install -y whatap-infra'],
        },
        {
          title: "Configure and start agent",
          commands: [
            'echo "license={accesskey}" | sudo tee /usr/whatap/infra/conf/whatap.conf',
            'echo "whatap.server.host={server_host}" | sudo tee -a /usr/whatap/infra/conf/whatap.conf',
            'echo "createdtime=$(date +%s%N)" | sudo tee -a /usr/whatap/infra/conf/whatap.conf',
            'sudo /etc/init.d/whatap-infra restart',
          ],
        },
      ],
    },
    {
      os: "FreeBSD",
      configPath: "/usr/whatap/infra/conf/whatap.conf",
      packageName: "whatap-infra",
      steps: [
        {
          title: "Download package",
          commands: ['wget https://repo.whatap.io/freebsd/10/whatap-infra.txz'],
        },
        {
          title: "Install agent",
          commands: ['pkg install whatap-infra.txz'],
        },
        {
          title: "Configure and start agent",
          commands: [
            'echo "license={accesskey}" | tee /usr/whatap/infra/conf/whatap.conf',
            'echo "whatap.server.host={server_host}" | tee -a /usr/whatap/infra/conf/whatap.conf',
            'echo "createdtime=$(date +%s%N)" | tee -a /usr/whatap/infra/conf/whatap.conf',
            'service whatap_infra restart',
          ],
        },
      ],
    },
    {
      os: "AIX",
      configPath: "/usr/whatap/infra/conf/whatap.conf",
      packageName: "whatap-infra",
      steps: [
        {
          title: "Download package",
          commands: ['wget http://repo.whatap.io/aix/noarch/whatap-infra-latest.noarch.rpm'],
        },
        {
          title: "Install agent",
          commands: ['rpm -Uvh whatap-infra-latest.noarch.rpm'],
        },
        {
          title: "Configure and start agent",
          commands: [
            'echo "license={accesskey}" | tee /usr/whatap/infra/conf/whatap.conf',
            'echo "whatap.server.host={server_host}" | tee -a /usr/whatap/infra/conf/whatap.conf',
            'echo "createdtime=$(date +%s%S)" | tee -a /usr/whatap/infra/conf/whatap.conf',
            'startsrc -s whatap-infra',
          ],
        },
      ],
    },
    {
      os: "Solaris",
      configPath: "/usr/whatap/infra/conf/whatap.conf",
      packageName: "whatap-infra",
      steps: [
        {
          title: "Download and install",
          commands: [
            'wget https://repo.whatap.io/sunos/10/whatap-infra.latest.SPARC.pkg.tar.gz',
            'gunzip -c whatap-infra.latest.SPARC.pkg.tar.gz | tar xvf -',
            './whatap-infra/install.sh {accesskey} {server_host}',
          ],
        },
        {
          title: "Start agent",
          commands: ['/etc/init.d/whatap-infra start'],
        },
      ],
    },
    {
      os: "HP-UX",
      configPath: "/usr/whatap/infra/conf/whatap.conf",
      packageName: "whatap-infra",
      steps: [
        {
          title: "Download and install",
          commands: [
            'wget https://repo.whatap.io/hpux/whatap-infra.latest.ia64.tar.gz',
            'gunzip -c whatap-infra.latest.ia64.tar.gz | tar xvf -',
            './whatap-infra/install.sh {accesskey} {server_host}',
          ],
        },
        {
          title: "Start agent",
          commands: ['/sbin/init.d/whatap-infra start'],
        },
      ],
    },
    {
      os: "Windows Server",
      configPath: "C:\\Program Files\\WhatapInfra\\whatap.conf",
      packageName: "whatap-infra",
      steps: [
        {
          title: "Download and install",
          description: "Download the installer from the WhaTap console and run it. The installer will prompt for the access key and server host.",
          commands: [
            '# Download whatap_infra.exe from WhaTap console',
            '# Run the installer — it will ask for:',
            '#   Access Key: {accesskey}',
            '#   WhaTap Server: {server_host}',
          ],
        },
      ],
      notes: ["Requires Administrator privileges.", "The agent runs as a Windows service."],
    },
  ],
};

// ─── APM Agents ──────────────────────────────────────────────────

const JAVA_GUIDE: PlatformInstallGuide = {
  platform: "JAVA",
  agentType: "whatap-java-agent",
  description: "WhaTap Java APM agent (supports Spring Boot, Tomcat, JBoss, WebLogic, Jeus, Jetty, Resin)",
  steps: [
    {
      title: "Download agent",
      commands: [
        'wget https://api.whatap.io/agent/whatap.agent.java.tar.gz',
        'tar -xzf whatap.agent.java.tar.gz',
      ],
    },
    {
      title: "Configure agent",
      commands: [
        'echo "license={accesskey}" > whatap.conf',
        'echo "whatap.server.host={server_host}" >> whatap.conf',
        'echo "whatap.server.port={server_port}" >> whatap.conf',
      ],
    },
    {
      title: "Add JVM option",
      description: "Add the -javaagent option to your JVM startup command.",
      commands: [
        'java -javaagent:{WHATAP_HOME}/whatap.agent-X.Y.Z.jar -jar your-app.jar',
      ],
    },
    {
      title: "Restart application",
      commands: ['# Restart your Java application with the -javaagent option above'],
    },
  ],
  notes: [
    "Supports Java 6+.",
    "Set WHATAP_HOME to the directory containing whatap.conf and the agent jar.",
  ],
};

const NODEJS_GUIDE: PlatformInstallGuide = {
  platform: "NODEJS",
  agentType: "whatap-node-agent",
  description: "WhaTap Node.js APM agent",
  steps: [
    {
      title: "Install agent package",
      commands: ['npm install whatap'],
    },
    {
      title: "Configure agent",
      commands: [
        'echo "license={accesskey}" > whatap.conf',
        'echo "whatap.server.host={server_host}" >> whatap.conf',
        'echo "whatap.server.port={server_port}" >> whatap.conf',
      ],
    },
    {
      title: "Add to application entry point",
      description: "Add the following as the FIRST line of your main .js file:",
      commands: [
        "const whatap = require('whatap').NodeAgent;",
      ],
    },
    {
      title: "Restart application",
      commands: ['# Restart your Node.js application'],
    },
  ],
  notes: ["Supports Node.js 17.0.0+."],
};

const PYTHON_GUIDE: PlatformInstallGuide = {
  platform: "PYTHON",
  agentType: "whatap-python-agent",
  description: "WhaTap Python APM agent (supports Flask, Django, FastAPI)",
  steps: [
    {
      title: "Install agent package",
      commands: ['pip install whatap-python'],
    },
    {
      title: "Configure agent",
      commands: [
        'whatap-setting-config \\',
        '  --host {server_host} \\',
        '  --license {accesskey} \\',
        '  --app_name your-app-name \\',
        '  --app_process_name your-process',
      ],
    },
    {
      title: "Start with whatap-start-agent",
      commands: ['whatap-start-agent python your_app.py'],
    },
  ],
  notes: ["Supports Python 3.7+.", "For Docker, add whatap-python to requirements.txt."],
};

const PHP_GUIDE: PlatformInstallGuide = {
  platform: "PHP",
  agentType: "whatap-php-agent",
  description: "WhaTap PHP APM agent",
  osVariants: [
    {
      os: "RedHat/CentOS",
      configPath: "/usr/whatap/php/conf/whatap.conf",
      packageName: "whatap-php",
      steps: [
        {
          title: "Add repository and install",
          commands: [
            'sudo rpm -Uvh https://repo.whatap.io/centos/5/noarch/whatap-repo-1.0-1.noarch.rpm',
            'sudo yum install -y whatap-php',
          ],
        },
        {
          title: "Configure agent",
          commands: [
            'echo "license={accesskey}" | sudo tee /usr/whatap/php/conf/whatap.conf',
            'echo "whatap.server.host={server_host}" | sudo tee -a /usr/whatap/php/conf/whatap.conf',
            'sudo /usr/whatap/php/install.sh',
          ],
        },
        {
          title: "Restart web server",
          commands: [
            'sudo service httpd restart  # or: sudo service apache2 restart / sudo service php-fpm restart',
          ],
        },
      ],
    },
    {
      os: "Debian/Ubuntu",
      configPath: "/usr/whatap/php/conf/whatap.conf",
      packageName: "whatap-php",
      steps: [
        {
          title: "Add repository and install",
          commands: [
            'curl -s https://repo.whatap.io/debian/release.gpg | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/whatap-release.gpg > /dev/null',
            'echo "deb [signed-by=/etc/apt/trusted.gpg.d/whatap-release.gpg] https://repo.whatap.io/debian unstable/" | sudo tee /etc/apt/sources.list.d/whatap.list',
            'sudo apt-get update && sudo apt-get install -y whatap-php',
          ],
        },
        {
          title: "Configure agent",
          commands: [
            'echo "license={accesskey}" | sudo tee /usr/whatap/php/conf/whatap.conf',
            'echo "whatap.server.host={server_host}" | sudo tee -a /usr/whatap/php/conf/whatap.conf',
            'sudo /usr/whatap/php/install.sh',
          ],
        },
        {
          title: "Restart web server",
          commands: [
            'sudo service apache2 restart  # or: sudo service php-fpm restart',
          ],
        },
      ],
    },
    {
      os: "Alpine Linux",
      configPath: "/usr/whatap/php/conf/whatap.conf",
      packageName: "whatap-php",
      steps: [
        {
          title: "Install",
          commands: [
            'wget https://repo.whatap.io/alpine/x86_64/whatap-php.apk',
            'apk add --allow-untrusted whatap-php.apk',
          ],
        },
        {
          title: "Configure and restart",
          commands: [
            'echo "license={accesskey}" | tee /usr/whatap/php/conf/whatap.conf',
            'echo "whatap.server.host={server_host}" | tee -a /usr/whatap/php/conf/whatap.conf',
            '/usr/whatap/php/install.sh',
          ],
        },
      ],
    },
    {
      os: "FreeBSD",
      configPath: "/usr/whatap/php/conf/whatap.conf",
      packageName: "whatap-php",
      steps: [
        {
          title: "Install",
          commands: [
            'wget https://repo.whatap.io/freebsd/10/whatap-php.txz',
            'pkg install whatap-php.txz',
          ],
        },
        {
          title: "Configure and restart",
          commands: [
            'echo "license={accesskey}" | tee /usr/whatap/php/conf/whatap.conf',
            'echo "whatap.server.host={server_host}" | tee -a /usr/whatap/php/conf/whatap.conf',
            '/usr/whatap/php/install.sh',
          ],
        },
      ],
    },
  ],
  notes: ["Supports PHP 5.2+, 7.x, 8.x.", "OS support: Linux, FreeBSD, Windows."],
};

const DOTNET_GUIDE: PlatformInstallGuide = {
  platform: "DOTNET",
  agentType: "whatap-dotnet-agent",
  description: "WhaTap .NET APM agent (supports IIS, Kestrel)",
  osVariants: [
    {
      os: "Windows",
      configPath: "C:\\Program Files\\WhatapDotnet\\whatap.conf",
      packageName: "whatap-dotnet",
      steps: [
        {
          title: "Download and install",
          description: "Download the .NET agent installer from the WhaTap console.",
          commands: [
            '# Download whatap_dotnet.exe from WhaTap console',
            '# Run installer with Access Key: {accesskey}',
            '# Set WhaTap Server: {server_host}',
          ],
        },
        { title: "Restart IIS", commands: ['iisreset'] },
      ],
    },
    {
      os: "Linux",
      configPath: "/usr/whatap/dotnet/whatap.conf",
      packageName: "whatap-dotnet",
      steps: [
        {
          title: "Install agent",
          commands: [
            'wget https://repo.whatap.io/debian/whatap-dotnet.deb',
            'sudo dpkg -i whatap-dotnet.deb',
          ],
        },
        {
          title: "Configure",
          commands: [
            'echo "license={accesskey}" | sudo tee /usr/whatap/dotnet/whatap.conf',
            'echo "whatap.server.host={server_host}" | sudo tee -a /usr/whatap/dotnet/whatap.conf',
          ],
        },
        { title: "Restart application", commands: ['# Restart your .NET application'] },
      ],
    },
  ],
  notes: ["Supports .NET Framework 4.6.1+.", "Windows Server 2012+ (IIS 8.0+), Ubuntu 20.04+."],
};

const GO_GUIDE: PlatformInstallGuide = {
  platform: "GO",
  agentType: "whatap-go-agent",
  description: "WhaTap Go APM agent (supports Gin, Echo, Fiber)",
  steps: [
    {
      title: "Install Go library",
      commands: ['go get github.com/whatap/go-api'],
    },
    {
      title: "Configure agent",
      commands: [
        'echo "license={accesskey}" > whatap.conf',
        'echo "whatap.server.host={server_host}" >> whatap.conf',
        'echo "whatap.server.port={server_port}" >> whatap.conf',
        'echo "app_name=your-app-name" >> whatap.conf',
      ],
    },
    {
      title: "Initialize in your application",
      commands: [
        'import "github.com/whatap/go-api/trace"',
        '// In main(): trace.Init(nil)  defer trace.Shutdown()',
      ],
    },
  ],
  notes: ["Supports Go 1.18+.", "OS: Red Hat/CentOS, Debian/Ubuntu, Amazon Linux, Alpine."],
};

// ─── Database Agents ─────────────────────────────────────────────

function buildDbGuide(
  platform: string,
  displayName: string,
  versionInfo: string,
): PlatformInstallGuide {
  return {
    platform,
    agentType: "whatap-dbx-agent",
    description: `WhaTap ${displayName} database monitoring agent`,
    steps: [
      {
        title: "Check requirements",
        description: `Supported: ${versionInfo}. Agent server requires Java 8+.`,
        commands: ['java -version  # Must be Java 8+'],
      },
      {
        title: "Create monitoring account",
        description: `Create a monitoring user in your ${displayName} database with appropriate read privileges.`,
        commands: [
          `# Create a monitoring user in ${displayName} (refer to WhaTap docs for required permissions)`,
        ],
      },
      {
        title: "Download DBX agent",
        commands: [
          'wget https://api.whatap.io/agent/whatap.agent.database.tar.gz',
          'tar -xzf whatap.agent.database.tar.gz',
        ],
      },
      {
        title: "Configure agent",
        commands: [
          'echo "license={accesskey}" > whatap.conf',
          'echo "whatap.server.host={server_host}" >> whatap.conf',
          'echo "whatap.server.port={server_port}" >> whatap.conf',
          `echo "dbms=${platform.toLowerCase()}" >> whatap.conf`,
          `echo "db_ip=YOUR_DB_HOST" >> whatap.conf`,
          `echo "db_port=YOUR_DB_PORT" >> whatap.conf`,
        ],
      },
      {
        title: "Start agent",
        commands: ['./start.sh'],
      },
    ],
    notes: [`Supports ${versionInfo}.`, "The DBX agent can run on a separate server or on the DB server."],
  };
}

const DB_GUIDES: PlatformInstallGuide[] = [
  buildDbGuide("POSTGRESQL", "PostgreSQL", "PostgreSQL 9.2+"),
  buildDbGuide("ORACLE", "Oracle", "Oracle 10gR2+"),
  buildDbGuide("ORACLE_DMA", "Oracle Pro (DMA)", "Oracle 11gR2+"),
  buildDbGuide("MYSQL", "MySQL/MariaDB", "MySQL 5.5+ / MariaDB 5.5+"),
  buildDbGuide("MSSQL", "SQL Server", "SQL Server 2005+"),
  buildDbGuide("TIBERO", "Tibero", "Tibero 5+"),
  buildDbGuide("CUBRID", "CUBRID", "CUBRID 9+"),
  buildDbGuide("ALTIBASE", "Altibase", "Altibase 6+"),
  buildDbGuide("REDIS", "Redis", "Redis 3.2+"),
  buildDbGuide("MONGODB", "MongoDB", "MongoDB 4.2+"),
  buildDbGuide("DB2", "IBM DB2", "DB2 9.7+"),
  buildDbGuide("SAP_ASE", "SAP ASE", "SAP ASE 15.7+"),
];

// ─── Kubernetes ──────────────────────────────────────────────────

const KUBERNETES_GUIDE: PlatformInstallGuide = {
  platform: "KUBERNETES",
  agentType: "whatap-kube-agent",
  description: "WhaTap Kubernetes monitoring agent (Helm or YAML)",
  steps: [
    {
      title: "Install via Helm",
      commands: [
        'helm repo add whatap https://whatap.github.io/helm',
        'helm repo update',
        'helm install whatap-kube whatap/whatap-kube \\',
        '  --set config.license={accesskey} \\',
        '  --set config.whatap_server_host={server_host} \\',
        '  --set config.whatap_server_port={server_port} \\',
        '  -n whatap-monitoring --create-namespace',
      ],
    },
  ],
  notes: [
    "Supports K8s 1.16+.",
    "Container runtime: containerd, Docker Engine, CRI-O.",
    "For YAML install, download manifests from the WhaTap console.",
  ],
};

// ─── Server Application Agents ───────────────────────────────────

function buildServerAppGuide(
  platform: string,
  displayName: string,
  description: string,
): PlatformInstallGuide {
  return {
    platform,
    agentType: "whatap-infra + feature plugin",
    description,
    steps: [
      {
        title: "Install WhaTap infra agent (if not already installed)",
        commands: [
          '# Follow the INFRA installation for your OS first',
        ],
      },
      {
        title: "Install monitoring plugin",
        commands: [
          `curl http://repo.whatap.io/telegraf/feature/${platform.toLowerCase()}/install_${platform.toLowerCase()}_monitoring.sh -o install.sh`,
          'chmod +x install.sh',
          'sudo ./install.sh "{accesskey}" "{server_host}"',
        ],
      },
      {
        title: "Configure and restart",
        description: `Follow ${displayName}-specific configuration in the WhaTap console.`,
        commands: [`# Refer to WhaTap docs for ${displayName}-specific setup`],
      },
    ],
  };
}

const SERVER_APP_GUIDES: PlatformInstallGuide[] = [
  buildServerAppGuide("KAFKA", "Kafka", "WhaTap Kafka monitoring via Jolokia agent"),
  buildServerAppGuide("AEROSPIKE", "Aerospike", "WhaTap Aerospike monitoring"),
  buildServerAppGuide("APACHEPULSAR", "Apache Pulsar", "WhaTap Apache Pulsar monitoring"),
  buildServerAppGuide("NGINX", "NGINX", "WhaTap NGINX monitoring"),
  buildServerAppGuide("APACHE", "Apache HTTP Server", "WhaTap Apache monitoring"),
  buildServerAppGuide("MILVUS", "Milvus", "WhaTap Milvus vector database monitoring"),
  buildServerAppGuide("VCENTER", "vCenter", "WhaTap VMware vCenter monitoring"),
];

// ─── Other Platforms ─────────────────────────────────────────────

const LOG_GUIDE: PlatformInstallGuide = {
  platform: "LOG",
  agentType: "whatap-log-agent",
  description: "WhaTap log monitoring agent",
  steps: [
    {
      title: "Install log agent",
      description: "Choose Container, Linux, Windows, or macOS.",
      commands: [
        '# Linux:',
        'curl -s https://repo.whatap.io/debian/release.gpg | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/whatap-release.gpg > /dev/null',
        'echo "deb [signed-by=/etc/apt/trusted.gpg.d/whatap-release.gpg] https://repo.whatap.io/debian unstable/" | sudo tee /etc/apt/sources.list.d/whatap.list',
        'sudo apt-get update && sudo apt-get install -y whatap-infra',
      ],
    },
    {
      title: "Configure log collection",
      commands: [
        'echo "license={accesskey}" | sudo tee /usr/whatap/infra/conf/whatap.conf',
        'echo "whatap.server.host={server_host}" | sudo tee -a /usr/whatap/infra/conf/whatap.conf',
        'echo "logsink.enabled=true" | sudo tee -a /usr/whatap/infra/conf/whatap.conf',
      ],
    },
  ],
  notes: ["Supports Linux, Windows, macOS, and container deployments."],
};

const NPM_GUIDE: PlatformInstallGuide = {
  platform: "NPM",
  agentType: "whatap-npm-agent",
  description: "WhaTap Network Performance Monitoring agent",
  steps: [
    {
      title: "Install NPM agent",
      commands: [
        'curl -s https://repo.whatap.io/debian/release.gpg | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/whatap-release.gpg > /dev/null',
        'echo "deb [signed-by=/etc/apt/trusted.gpg.d/whatap-release.gpg] https://repo.whatap.io/debian unstable/" | sudo tee /etc/apt/sources.list.d/whatap.list',
        'sudo apt-get update && sudo apt-get install -y whatap-npm',
      ],
    },
    {
      title: "Configure",
      commands: [
        'echo "license={accesskey}" | sudo tee /usr/whatap/npm/conf/whatap.conf',
        'echo "whatap.server.host={server_host}" | sudo tee -a /usr/whatap/npm/conf/whatap.conf',
        'sudo service whatap-npm restart',
      ],
    },
  ],
  notes: ["Supports Linux and Kubernetes."],
};

// ─── Exported Guide Index ────────────────────────────────────────

const ALL_GUIDES: PlatformInstallGuide[] = [
  INFRA_GUIDE,
  JAVA_GUIDE,
  NODEJS_GUIDE,
  PYTHON_GUIDE,
  PHP_GUIDE,
  DOTNET_GUIDE,
  GO_GUIDE,
  LOG_GUIDE,
  KUBERNETES_GUIDE,
  NPM_GUIDE,
  ...DB_GUIDES,
  ...SERVER_APP_GUIDES,
];

const GUIDE_MAP = new Map<string, PlatformInstallGuide>();
for (const g of ALL_GUIDES) {
  GUIDE_MAP.set(g.platform, g);
}

export function getInstallGuide(platform: string): PlatformInstallGuide | undefined {
  return GUIDE_MAP.get(platform.toUpperCase());
}

export function getAllPlatforms(): string[] {
  return ALL_GUIDES.map((g) => g.platform);
}
