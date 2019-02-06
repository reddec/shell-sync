import { projectRoot, projectTempDir, projectSlug } from './project';

/**
 * Generates slug (lower-case, kebab-case) based on feed description
 * @param {Object} feed feed object
 */
export function feedSlug(feed) {
    return (feed.hint || 'script').toLowerCase().replace(/\s+/g, '-')
}

/**
 * Generates script name of feed
 * @param {Object} feed feed object
 */
export function feedScriptName(feed) {
    return feedSlug(feed) + '.sh'
}

/**
 * Generate full path to feed script
 * @param {Object} feed feed object
 * @param {Object} project project object
 */
export function feedScriptPath(feed, project) {
    return projectRoot(project) + "/scripts/" + feedScriptName(feed);
}

/**
 * Generate content of feed script
 * @param {Object} feed feed object
 * @param {Object} project project object
 */
export function feedScriptContent(feed, project) {
    return [
        "#!/usr/bin/env bash",
        "# Created at " + (new Date()),
        "#",
        "# Collects " + feed.hint + " one record per one line.",
        "# Data is collecting to temporary dir and splitted to " + project.batchSize + " records.",
        "set -e -o pipefail",
        "",
        feed.command + "\\",
        "    | stdbuf -oL -eL ts '%.s' \\",
        "    | stdbuf -oL -eL split -d -u -l " + project.batchSize + " - " + projectTempDir(project) + "/" + feedSlug(feed) + ".$(hostname).$(date +%s).",
    ].join("\n")
}

/**
 * Generates content of systemd unit file that runs feed script
 * @param {Object} feed feed object
 * @param {Object} project project object
 */
export function feedSystemdUnitContent(feed, project) {
    return [
        "[Unit]",
        "Description=collect " + feed.hint + " as part of " + project.name,
        "PartOf=" + projectSlug(project) + ".service",
        "After=" + projectSlug(project) + ".service",
        "",
        "[Service]",
        "ExecStart=" + feedScriptPath(feed, project),
        "Restart=always",
        "RestartSec=5",
        "",
        "[Install]",
        "WantedBy=" + projectSlug(project) + ".service"
    ].join("\n")
}


/**
 * Generates full path to systemd unit file that runs feed script
 * @param {Object} feed feed object
 * @param {Object} project project object
 */
export function feedSystemdUnitPath(feed, project) {
    return projectRoot(project) + "/systemd/" + feedServiceName(feed, project);
}
/**
 * Generates basename of systemd unit file that runs feed script
 * @param {Object} feed feed object
 * @param {Object} project project object
 */
export function feedServiceName(feed, project) {
    return projectSlug(project) + "." + feedSlug(feed) + ".service";
}
/**
 * Check that feed is empty (no fields filled)
 * @param {Object} feed feed object
 */
export function isFeedEmpty(feed) {
    return feed.command === '' && feed.hint === '';
}

