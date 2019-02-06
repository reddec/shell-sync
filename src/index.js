import React from 'react';
import ReactDOM from 'react-dom';
import saveAs from 'file-saver';
import './index.css'
import {
    feedScriptContent,
    feedScriptName,
    feedScriptPath,
    feedServiceName,
    feedSystemdUnitContent,
    feedSystemdUnitPath,
    isFeedEmpty
} from './feed';
import {
    enableAllScriptContent,
    enableAllScriptPath,
    projectArchive,
    projectReadmeContent,
    projectReadmePath,
    projectRoot,
    projectSlug,
    projectSyncScriptContent,
    projectSyncScriptPath,
    projectSyncTimerContent,
    projectSyncTimerName,
    projectSyncTimerPath,
    projectSyncUnitContent,
    projectSyncUnitName,
    projectSyncUnitPath,
    projectUnitContent,
    projectUnitName,
    projectUnitPath
} from './project';
import { workspaceLoad, workspaceSave } from "./workspace";

class Feed extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            focused: false
        }
    }

    focus = (e) => {
        if (this.props.onFocus) this.props.onFocus(e);
    };

    unfocus = (e) => {
        if (this.props.onBlur) this.props.onBlur(e);
    };

    onDelete = (e) => {
        if (this.props.onDelete) this.props.onDelete(e);
    };

    render() {
        return (
            <div>
                <div className="feed">

                    <input className="feed-command" value={this.props.command || ''}
                        placeholder="command to collect data"
                        onChange={(e) => this.props.onChange({ command: e.target.value })} onBlur={this.unfocus}
                        onFocus={this.focus} />
                    <span>#&nbsp;</span>
                    <input className="feed-hint" value={this.props.hint || ''} placeholder="record's type name"
                        onChange={(e) => this.props.onChange({ hint: e.target.value })} onBlur={this.unfocus}
                        onFocus={this.focus} />
                    <span className="lookup" onClick={this.onDelete}>🗑</span>
                </div>
            </div>
        );
    }
}


// Project
//   events:
//     - onFeedCreated(fullData)
//     - onFeedChanged(fullData, index)
//     - onFeedRemoved(partialData, index)
//     - onChange(partialData)
//

class Project extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            preview: {
                path: '',
                content: '',
            }
        };
        this.downloadArchive = this.downloadArchive.bind(this);
    }

    get feeds() {
        return this.props.feeds || [];
    }

    get project() {
        return this.props.project || {};
    }

    downloadArchive() {
        const feeds = this.feeds.filter((f) => !isFeedEmpty(f));
        projectArchive(feeds, this.project).then((content) => {
            saveAs(content, projectSlug(this.project) + ".zip")
        })
    }

    onFeedCreated = (feedData) => {
        if (this.props.onFeedCreated) this.props.onFeedCreated(feedData);
    };

    onFeedChanged = (partialData, index) => {
        if (this.props.onFeedChanged) this.props.onFeedChanged(partialData, index);
    };

    onFeedRemoved = (feedData, index) => {
        if (this.props.onFeedRemoved) this.props.onFeedRemoved(feedData, index);
    };

    onChange = (partialData) => {
        if (this.props.onChange) this.props.onChange(partialData);
    };

    preview = (file, content) => {
        this.setState({
            preview: {
                path: file,
                content: content
            }
        })
    };

    static ensureLastEmpty(feeds) {
        if (feeds.length === 0 || !isFeedEmpty(feeds[feeds.length - 1])) {
            feeds.push({
                command: '',
                hint: '',
            })
        }
    }

    addSample(name) {
        let feed;
        switch (name) {
            case "serial":
                feed = {
                    command: "stty -F /dev/ttyS0 speed 9600 cs8 -cstopb -parenb && cat /dev/ttyS0",
                    hint: "device1"
                };
                break;
            case "ping":
                feed = {
                    command: "ping example.com | stdbuf -oL -eL grep icmp | stdbuf -oL -eL tr '=' ' ' | stdbuf -oL -eL cut -d ' ' -f 10",
                    hint: "ping to example.com",
                };
                break;
            case "disk":
                feed = {
                    command: "while true; do df -h / | tail -n +2 |  awk '{print $4}'; sleep 1; done",
                    hint: "free space",
                };
                break;
            case 'empty':
                feed = {
                    command: '',
                    hint: '',
                };
                break;
            default:
                return;
        }
        if (!feed) return;
        // Project.ensureLastEmpty(feeds);
        this.onFeedCreated(feed);
    }

    render() {
        const feeds = this.feeds;
        const items = feeds.map((feed, i) =>
            <Feed {...feed} project={this.state} key={i} onChange={(data) => this.onFeedChanged(data, i)}
                onDelete={() => this.onFeedRemoved(feed, i)} />
        );
        return (
            <div>
                <div className="container">
                    <div className="item">
                        <h2>Project details</h2>
                        <div className="row">
                            <label>
                                Project title
                                <input type="text" value={this.project.name || ''} placeholder="moon extractor"
                                    onChange={(e) => this.onChange({ name: e.target.value })} />
                            </label>
                        </div>
                        <div className="row">
                            <label>
                                Target host
                                <input type="text" value={this.project.targetHost || ''}
                                    placeholder="user@example.com:/path/to/data - sync target URI"
                                    onChange={(e) => this.onChange({ targetHost: e.target.value })} />
                            </label>
                        </div>
                        <div className="row">
                            <label>
                                Records before sync
                                <input type="number" value={this.project.batchSize || ''}
                                    placeholder="number of records (lines) as batch"
                                    onChange={(e) => this.onChange({ batchSize: parseInt(e.target.value) })} />
                            </label>
                        </div>
                        <div className="row">
                            <label>
                                Root dir
                                <input type="text" value={this.project.root || '/opt'} placeholder="moon extractor"
                                    onChange={(e) => this.onChange({ root: e.target.value })} />
                            </label>
                            <small className="why">project root: {projectRoot(this.project)}</small>
                        </div>
                        <div className="row">
                            <label>
                                Working user
                                <input type="text" value={this.project.user || ''}
                                    placeholder="local user that owns ssh keys and have access to target hosts"
                                    onChange={(e) => this.onChange({ user: e.target.value })} />
                            </label>
                        </div>
                    </div>
                    <div className="item">
                        <h2>Requirements</h2>
                        <div className="row">
                            <ul>
                                <li>lsof
                                    <small className="why">to detect opened descriptors</small>
                                </li>
                                <li>rsync
                                    <small className="why">to push data to target host</small>
                                </li>
                                <li>bash
                                    <small className="why">to invoke scripts</small>
                                </li>
                                <li>systemd
                                    <small className="why">to control timers and services</small>
                                </li>
                                <li>ts
                                    <small className="why">to add timestamps for records (moreutils)</small>
                                </li>
                            </ul>
                            <span>Note: ssh access to target host should be without password (key based auth)</span>
                        </div>
                    </div>
                </div>
                {this.project.name &&
                    <div>
                        <div className="row">
                            <h2>Feeds</h2>
                            {
                                items
                            }
                            <div className="examples">
                                <button onClick={(e) => this.addSample('empty')}>+ empty</button>
                                <button onClick={(e) => this.addSample('ping')}>+ pinger</button>
                                <button onClick={(e) => this.addSample('disk')}>+ disk monitor</button>
                                <button onClick={(e) => this.addSample('serial')}>+ serial port</button>
                            </div>
                        </div>
                        <div className="row">
                            <h2>Files</h2>
                            {feeds.length > 0 &&
                                <div className="download">
                                    <button onClick={this.downloadArchive}>download {projectSlug(this.project)}.zip</button>
                                </div>
                            }
                            Root: {projectRoot(this.project)}/
                        <ul>
                                <li>
                                    <i>systemd</i>
                                    <ul className="files">
                                        {
                                            feeds.map(
                                                (feed, i) =>
                                                    <li key={i}
                                                        onClick={() => this.preview(feedSystemdUnitPath(feed, this.project), feedSystemdUnitContent(feed, this.project))}>
                                                        {feedServiceName(feed, this.project)}
                                                    </li>
                                            )
                                        }
                                        <li onClick={() => this.preview(projectSyncTimerPath(this.project), projectSyncTimerContent(this.project))}>
                                            {projectSyncTimerName(this.project)}
                                        </li>
                                        <li onClick={() => this.preview(projectSyncUnitPath(this.project), projectSyncUnitContent(this.project))}>
                                            {projectSyncUnitName(this.project)}
                                        </li>
                                        <li onClick={() => this.preview(projectUnitPath(this.project), projectUnitContent(this.project))}>
                                            {projectUnitName(this.project)}
                                        </li>
                                    </ul>
                                </li>
                                <li>
                                    <i>bin</i>
                                    <ul className="files">
                                        <li onClick={() => this.preview(projectSyncScriptPath(this.project), projectSyncScriptContent(this.project))}>
                                            sync.sh
                                    </li>
                                        <li onClick={() => this.preview(enableAllScriptPath(this.project), enableAllScriptContent(feeds, this.project))}>
                                            enable-all.sh
                                    </li>
                                    </ul>
                                </li>

                                <li><i>services</i>
                                    <ul className="files">
                                        {
                                            feeds.map(
                                                (feed, i) =>
                                                    <li key={i}
                                                        onClick={() => this.preview(feedScriptPath(feed, this.project), feedScriptContent(feed, this.project))}>
                                                        {feedScriptName(feed)}
                                                    </li>
                                            )
                                        }
                                    </ul>
                                </li>
                                <li><i>temp</i></li>
                                <li><i>to-sync</i></li>
                                <li className="files"
                                    onClick={() => this.preview(projectReadmePath(this.project), projectReadmeContent(feeds, this.project))}>README.md
                            </li>
                            </ul>
                        </div>
                        {this.state.preview.path &&
                            <div className="row">
                                <div className="feed-source feed-cli">
                                    $ cat {this.state.preview.path}
                                </div>
                                <div className="feed-source">
                                    {this.state.preview.content}
                                </div>

                            </div>
                        }
                    </div>
                }
            </div>
        )
    }
}


class Workspace extends React.Component {
    constructor(props) {
        super(props);
        let { configs, openedConfigNum } = workspaceLoad();

        this.state = {
            lastProject: 0,
            allProjects: configs,
            currentProject: null,
            openedProject: openedConfigNum,
        };
    }

    addProject = () => {
        let { allProjects } = this.state;
        let config = {
            project: {
                name: '',
                root: '/opt',
                batchSize: 100,
            },
            feeds: [],
        };
        allProjects.push(config);
        this.setState({
            currentProject: config,
            allProjects: allProjects,
            openedProject: allProjects.length - 1,
        }, () => {
            workspaceSave(this.state.allProjects, allProjects.length - 1);
        });
    };

    openProject(config, index) {
        this.setState({
            openedProject: index,
            currentProject: config,
        }, () => {
            workspaceSave(this.state.allProjects, this.state.openedProject);
        });

    };

    selectImportFile = (e) => {
        let files = [];
        for (let i = 0; i < e.target.files.length; ++i) {
            files.push(e.target.files[i]);
        }
        this.setState({ importFiles: files });
    };

    importWorkspace(ws) {
        let { allProjects } = this.state;
        allProjects = allProjects.concat(ws.configs);
        this.setState({ allProjects: allProjects }, () => {
            workspaceSave(this.state.allProjects, this.state.openedProject);
        })
    }

    importConfig(cfg) {
        let { allProjects } = this.state;
        allProjects.push(cfg);
        this.setState({ allProjects: allProjects }, () => {
            workspaceSave(this.state.allProjects, this.state.openedProject);
        })
    }

    importFiles = () => {
        let { importFiles = [] } = this.state;

        importFiles.forEach((file) => {
            let reader = new FileReader();
            reader.onload = (data) => {
                try {
                    let obj = JSON.parse(data.target.result);
                    if (obj.configs) this.importWorkspace(obj);
                    else this.importConfig(obj);
                } catch (e) {
                    console.error("import", file.name, ":", e);
                    alert(e)
                }
            };
            reader.readAsText(file);
        });
    };

    render() {
        return (
            <div className="workspace">
                <div className="terminal-menu">
                    <span className="link" onClick={() => this.setState({ currentProject: null })}>
                        SHOW WORKSPACE /
                    </span>
                    <span className="link" onClick={this.addProject}>
                        NEW PROJECT /
                    </span>
                    <span className="link" onClick={this.downloadWorkspace}>
                        EXPORT
                    </span>
                    {this.state.currentProject &&
                        <span className="title">
                            CURRENT PROJECT: {this.state.currentProject.project.name}
                        </span>
                    }
                </div>
                {this.renderBody()}
                {!this.state.currentProject && window.File && window.FileReader && window.FileList && window.Blob &&
                    <div>
                        <br />
                        <hr />
                        <br />
                        <h3>Import workspace or project</h3>
                        <div>
                            <input type="file" onChange={this.selectImportFile} />
                            <button onClick={this.importFiles}>import</button>
                        </div>
                    </div>
                }
            </div>
        )
    }


    onProjectChange = (partialData) => {
        let { currentProject } = this.state;
        Object.assign(currentProject.project, partialData);
        this.setState({ currentProject: currentProject }, () => {
            workspaceSave(this.state.allProjects, this.state.openedProject);
        });
    };

    onProjectDelete = (index) => {
        let { allProjects } = this.state;
        allProjects.splice(index, 1);
        this.setState({ allProjects: allProjects }, () => {
            workspaceSave(this.state.allProjects, this.state.openedProject);
        });
    };

    onFeedCreated = (fullData) => {
        let { currentProject } = this.state;
        currentProject.feeds.push(fullData);
        this.setState({ currentProject: currentProject }, () => {
            workspaceSave(this.state.allProjects, this.state.openedProject);
        });
    };

    onFeedChanged = (partialData, index) => {
        let { currentProject } = this.state;
        Object.assign(currentProject.feeds[index], partialData);
        this.setState({ currentProject: currentProject }, () => {
            workspaceSave(this.state.allProjects, this.state.openedProject);
        });
    };

    onFeedRemoved = (fullData, index) => {
        let { currentProject } = this.state;
        currentProject.feeds.splice(index, 1);
        this.setState({ currentProject: currentProject }, () => {
            workspaceSave(this.state.allProjects, this.state.openedProject);
        });
    };

    downloadWorkspace = () => {
        let data = JSON.stringify({
            configs: this.state.allProjects,
        }, null, 4);
        saveAs(new Blob([data]), 'workspace.json');
    };

    renderBody() {
        if (this.state.currentProject)
            return <Project project={this.state.currentProject.project}
                feeds={this.state.currentProject.feeds}
                onChange={this.onProjectChange}
                onFeedCreated={this.onFeedCreated}
                onFeedChanged={this.onFeedChanged}
                onFeedRemoved={this.onFeedRemoved} />;

        return (
            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th>PROJECT</th>
                        <th>TARGET</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    {this.state.allProjects.map((config, i) =>
                        <tr key={i}>
                            <td onClick={() => this.openProject(config, i)}>{i === this.state.openedProject && '>>'}</td>
                            <td onClick={() => this.openProject(config, i)}>{config.project.name || '/unnamed/'}</td>
                            <td onClick={() => this.openProject(config, i)}>{config.project.targetHost}</td>
                            <td>
                                <span className="lookup" onClick={(e) => this.onProjectDelete(i)}>[🗑 delete]</span>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        )
    }

}


window.makeWorkspace = function (element) {
    ReactDOM.render(React.createElement(Workspace), element);
};