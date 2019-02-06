import {
    feedScriptContent,
    feedServiceName,
    feedSlug,
    feedSystemdUnitPath,
    feedSystemdUnitContent,
    feedScriptName
} from "./feed";
import * as JSZip from 'jszip';

/**
 * Generate full path to project root dir
 * @param {Object} project project definition
 */
export function projectRoot(project) {
    return project.root + "/" + projectSlug(project)
}

/**
 * Generate full path to project dir for temporary files (records before batch)
 * @param {Object} project project definition
 */
export function projectTempDir(project) {
    return projectRoot(project) + "/temp"
}

/**
 * Generate full path to porject dir for files prepared to send/synchronize
 * @param {Object} project project definition
 */
export function projectSyncDir(project) {
    return projectRoot(project) + "/to-sync"
}

/**
 * Generates slug (lower-case, kebab-case) based on project nam
 * @param {Object} project project definition
 */
export function projectSlug(project) {
    return project.name.toLowerCase().replace(/\s+/g, '-')
}

/**
 * Generates content of sunchronization script
 * @param {Object} project project definition
 */
export function projectSyncScriptContent(project) {
    return [
        "#!/usr/bin/env bash",
        "# Created at " + (new Date()),
        "#",
        "# Moves all files wihout opened descriptors from temp-directory to the target directory.",
        "# Expects that once closed file should not be opened again.",
        "# After moves tries to push prepared files to master host",
        "set -e -o pipefail",
        "",
        "ls -t \"" + projectTempDir(project) + "\" | while read FILE;",
        "do",
        "    if ! lsof \"" + projectTempDir(project) + "/$FILE\"; then",
        "        echo \"$FILE\"",
        "        mv \"" + projectTempDir(project) + "/$FILE\" \"" + projectSyncDir(project) + "/$FILE\"",
        "    fi",
        "done ",
        "# send to master host (push)",
        "/usr/bin/rsync -a --remove-source-files " + projectSyncDir(project) + "/. " + project.targetHost,
    ].join("\n")
}

/**
 * Generates full path to synchronization script
 * @param {Object} project project definition
 */
export function projectSyncScriptPath(project) {
    return projectRoot(project) + "/bin/sync.sh"
}


/**
 * Generates full path service synchronization systemd unit file
 * @param {Object} project project definition
 */
export function projectSyncUnitPath(project) {
    return projectRoot(project) + "/systemd/" + projectSyncUnitName(project);
}

/**
 * Generates base name service synchronization systemd unit file
 * @param {Object} project project definition
 */
export function projectSyncUnitName(project) {
    return projectSlug(project) + "-sync.service";
}

/**
 * Generates service synchronization systemd unit file content
 * @param {Object} project project definition
 */
export function projectSyncUnitContent(project) {
    return [
        "[Unit]",
        "Description=Synchronize " + project.name,
        "Wants=" + projectSlug(project) + "-sync.timer",
        "",
        "[Service]",
        "ExecStart=" + projectSyncScriptPath(project),
        "User=" + (project.user || "root"),
        "",
        "[Install]",
        "WantedBy=" + projectUnitName(project)
    ].join("\n")
}

/**
 * Generates service synchronization systemd TIMER file path
 * @param {Object} project project definition
 */
export function projectSyncTimerPath(project) {
    return projectRoot(project) + "/systemd/" + projectSyncTimerName(project);
}

/**
 * Generates service synchronization systemd TIMER base name
 * @param {Object} project project definition
 */
export function projectSyncTimerName(project) {
    return projectSlug(project) + "-sync.timer";
}

/**
 * Generates service synchronization systemd TIMER file content
 * @param {Object} project project definition
 */
export function projectSyncTimerContent(project) {
    return [
        "[Unit]",
        "Description=Synchronization timer of " + project.name,
        "Requires=" + projectSyncUnitName(project),
        "PartOf=" + projectUnitName(project),
        "After=" + projectUnitName(project),
        "",
        "[Timer]",
        "Unit=" + projectSyncTimerName(project),
        "OnUnitInactiveSec=1m",
        "User=" + (project.user || "root"),
        "",
        "[Install]",
        "WantedBy=" + projectUnitName(project)
    ].join("\n")
}


/**
 * Generates main project systemd service file content
 * @param {Object} project project definition
 */
export function projectUnitContent(project) {
    return [
        "[Unit]",
        "Description=" + project.name,
        "",
        "[Service]",
        "Type=oneshot",
        "ExecStart=/bin/true",
        "RemainAfterExit=yes",
        "User=" + (project.user || "root"),
        "",
        "[Install]",
        "WantedBy=multi-user.target"
    ].join("\n")
}

/**
 * Generates main project systemd service file path
 * @param {Object} project project definition
 */
export function projectUnitPath(project) {
    return projectRoot(project) + "/systemd/" + projectUnitName(project)
}

/**
 * Generates main project systemd service base name
 * @param {Object} project project definition
 */
export function projectUnitName(project) {
    return projectSlug(project) + ".service"
}

/**
 * Generates content of script that enables all services in the project
 * @param {Array} feeds all feeds
 * @param {Object} project project definition
 */
export function enableAllScriptContent(feeds, project) {
    return [
        "#!/usr/bin/env bash",
        "# Created at " + (new Date()),
        "#",
        "# Enables all services in " + project.name + " including sync unit and project itself",
        "",
        "mkdir -p " + projectTempDir(project) + " " + projectSyncDir(project),
        "systemctl enable " + projectUnitPath(project) + " " + projectSyncTimerPath(project) + " " + projectSyncUnitPath(project) + " " + feeds.map((feed) => feedSystemdUnitPath(feed, project)).join(" ")
    ].join("\n")
}

/**
 * Generates full path of disable-all script
 * @param {Object} project project definition
 */
export function disableAllScriptPath(project) {
    return projectRoot(project) + "/bin/disable-all.sh"
}


/**
 * Generates content of script that disable all services in the project
 * @param {Array} feeds all feeds
 * @param {Object} project project definition
 */
export function disableAllScriptContent(feeds, project) {
    return [
        "#!/usr/bin/env bash",
        "# Created at " + (new Date()),
        "#",
        "# Disable all services in " + project.name + " including sync unit and project itself",
        "",
        "systemctl stop " + projectUnitName(project),
        "systemctl disable " + projectUnitPath(project) + " " + projectSyncTimerPath(project) + " " + projectSyncUnitPath(project) + " " + feeds.map((feed) => feedSystemdUnitPath(feed, project)).join(" ")
    ].join("\n")
}

/**
 * Generates full path of enable-all script
 * @param {Object} project project definition
 */
export function enableAllScriptPath(project) {
    return projectRoot(project) + "/bin/enable-all.sh"
}

/**
 * Generate production ready readme document for the project
 * @param feeds all feeds
 * @param project project definition
 * @returns {string} markdown document
 */
export function projectReadmeContent(feeds, project) {
    let data = [
        '# ' + project.name,
        '',
        'The project designed to collect data through a several sources (feeds),' +
        ' aggregate as ' + project.batchSize + ' records batch and then push data to the remote host ' +
        'over rsync (' + project.targetHost + ')',
        '',
        'rsync uses temporary files, so it\'s safe to use something like `cat <record type>.*` on the target server side',
        'to combine multiple batches',
        '',
        '# Parameters',
        '',
        '* **project name**: ' + project.name,
        '* **created**: ' + (new Date()),
        '* **batch size**: ' + project.batchSize,
        '* **target rsync URI**: ' + project.targetHost,
        '* **root dir**: ' + project.root,
        '* **check interval**: 1 minute',
        '',
        '# Requirements',
        '',
        '* **lsof** - to detect opened descriptors and find prepared batches',
        '* **rsync** - to push data to target host',
        '* **bash** - for scripts',
        '* **systemd** - for timers and service management',
        '* **ts** - for timestamps in a records (moreutils)',
        '',
        'Note: ssh access to target host should be without password (key based auth)',
        '',
        '# Installation',
        '',
        '1. Unpack archive to `' + project.root + '`. By the path ' + projectUnitPath(project) + ' should be main service file',
        '2. Invoke `' + enableAllScriptPath(project) + '`. It will enable all included services but not yet start them',
        '3. Invoke `systemctl start ' + projectUnitName(project) + '` to start all services and timers',
        '',
        '# Control',
        '',
        '* To see all installed services: `systemctl list-unit-files ' + projectSlug(project) + '*`',
        '* Start everything: `systemctl start ' + projectUnitName(project) + '`',
        '* Stop everything: `systemctl stop ' + projectUnitName(project) + '`',
        '',
        '# Feeds (sources)',
        '',
    ];
    feeds.forEach((feed) => {
        data = data.concat([
            '## ' + feed.hint,
            '',
            'Script content',
            '',
            '```bash',
            feed.command,
            '```',
            '',
            'Service name: `' + feedServiceName(feed, project) + '`',
            '',
            '* start: `systemctl start ' + feedServiceName(feed, project) + '`',
            '* stop: `systemctl stop ' + feedServiceName(feed, project) + '`',
            '* logs: `journalctl -u ' + feedServiceName(feed, project) + ' `',
            '',
            'Files:',
            '',
            '* service unit file: ' + feedSystemdUnitPath(feed, project),
            '* service script: ' + feedSystemdUnitPath(feed, project),
            '* temp batch file mask: `' + projectTempDir(project) + '/' + feedSlug(feed) + '.*.*.*`',
            '* prepared batch file mask: `' + projectSyncDir(project) + '/' + feedSlug(feed) + '.*.*.*`',
            '',
        ])
    });
    return data.join("\n");
}

/**
 * Generates full path of readme document
 * @param project project definition
 * @returns {string} full path
 */
export function projectReadmePath(project) {
    return projectRoot(project) + "/README.md"
}

/**
 * Generate JSON config of project
 * @param feeds all feeds definition
 * @param project project definition
 */
export function projectConfigObject(feeds, project) {
    return {
        project: {
            name: project.name,
            targetHost: project.targetHost,
            batchSize: project.batchSize,
            root: project.root,
        },
        feeds: JSON.parse(JSON.stringify(feeds)), // fast deep copy
    }
}

/**
 * Parse JSON config of project
 * @param data JSON text
 * @returns {{feeds: Array, project: Object}}
 */
export function parseConfigContent(data) {
    let config = JSON.parse(data);
    let feeds = config.feeds || [];
    delete config['feeds'];
    return {project: config, feeds: feeds};
}


/**
 * Generate archive with all files in project
 * @param feeds all feeds definition
 * @param project project definition
 * @returns {*} promise with a blob as zip archive
 */
export function projectArchive(feeds, project) {
    // static files
    let files = {
        'README.md': projectReadmeContent(feeds, project),
        'bin/sync.sh': projectSyncScriptContent(project),
        'bin/enable-all.sh': enableAllScriptContent(feeds, project),
        'bin/disable-all.sh': disableAllScriptContent(feeds, project),
        "config.json": JSON.stringify(projectConfigObject(feeds, project), null, 4),
    };

    // main project files
    files[`systemd/${projectUnitName(project)}`] = projectUnitContent(project);
    files[`systemd/${projectSyncTimerName(project)}`] = projectSyncTimerContent(project);
    files[`systemd/${projectSyncUnitName(project)}`] = projectSyncUnitContent(project);

    // feeds files
    feeds.forEach((feed) => {
        files[`systemd/${feedServiceName(feed, project)}`] = feedSystemdUnitContent(feed, project);
        files[`scripts/${feedScriptName(feed)}`] = feedScriptContent(feed, project);
    });

    let zip = new JSZip();
    let root = zip.folder(projectSlug(project));

    for (let fileName in files) {
        let options = (void 0);
        if (fileName.endsWith('.sh')) {
            options = {unixPermissions: "755"};
        }
        root.file(fileName, files[fileName], options);
    }
    root.folder('temp');
    root.folder('to-sync');

    return zip.generateAsync({type: 'blob', platform: 'UNIX'});
}