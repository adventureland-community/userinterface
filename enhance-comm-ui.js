// ==UserScript==
// @name         Adventure.land COMM UI Enhancement
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  enhance https://adventure.land/comm
// @author       You
// @match        https://adventure.land/comm
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function formatTime(time) {
        if (!time) {
            return '?'
        }

        return [
            {unit: 's', n: 1},
            {unit: 'min', n: 60},
            {unit: 'h', n: 3600},
            {unit: 'd', n: 86400},
        ]
            .reduceRight((memo, prefix, index) => {
            if (memo) {
                return memo
            }
            if (index === 0) {
                return `${time.toFixed(0)}${prefix.unit}`
            }
            if (time >= prefix.n) {
                return `${(time / prefix.n).toFixed(1)}${prefix.unit}`
            }
        }, undefined)
    }

    function getPercent(value) {
        return `${Math.max(0, Math.min(100, value * 100)).toFixed(1)}%`
    }

    function onLoad() {
        const React = window.React
        const ReactDOM = window.ReactDOM
        const e = window.React.createElement

        const classColors = {
            merchant: "#7f7f7f",
            mage: "#3e6eed",
            warrior: "#f07f2f",
            priest: "#eb4d82",
            ranger: "#8a512b",
            paladin: "#a3b4b9",
            rogue: "#44b75c",
        }

        const timeZones = {
            '0': 'UTC', // Fallback
            '-5': 'America/New_York', // US
            '1': 'Europe/Berlin', // EU
            '7': 'Asia/Bangkok', // ASIA
        }

        const getTimeUntil = (dateString) => {
            if (!dateString) {
                return ''
            }

            const target = new Date(dateString)
            const now = new Date()

            return formatTime((target - now) / 1000)
        }

        const useEntities = () => {
            const [entities, setEntities] = React.useState([])

            React.useEffect(() => {
                const interval = setInterval(() => {
                    setEntities(Object.values(window.entities))
                }, 1000)

                return () => clearInterval(interval)
            }, [])

            return entities
        }

        const useServerInfo = () => {
            const [serverInfo, setServerInfo] = React.useState({})

            React.useEffect(() => {
                const interval = setInterval(() => {
                    setServerInfo({
                        S: window.S,
                        serverRegion: window.server_region,
                        serverIdentifier: window.server_identifier,
                    })
                }, 1000)

                return () => clearInterval(interval)
            }, [])

            return serverInfo
        }

        const useObservingCharacterId = () => {
            const [observingCharacterId, setObservingCharacterId] = React.useState(undefined)

            React.useEffect(() => {
                const interval = setInterval(() => {
                    setObservingCharacterId(window.observing?.id)
                }, 1000)

                return () => clearInterval(interval)
            }, [])

            return observingCharacterId
        }

        const useObservingCharacter = () => {
            const characterId = useObservingCharacterId()
            const entities = useEntities()

            return React.useMemo(() => {
                if (!characterId) {
                    return
                }

                return entities.find((e) => e.id === characterId)
            }, [entities, characterId])
        }

        const useObservingCharacterTarget = () => {
            const character = useObservingCharacter()
            const entities = useEntities()

            return React.useMemo(() => {
                if (!character || !character.target) {
                    return
                }

                return entities.find((e) => e.id === character.target)
            }, [entities, character])
        }

        const Players = (props) => {
            const entities = useEntities()

            const G = React.useMemo(() => window.G, [])

            const players = React.useMemo(() => {
                return entities
                    .filter((e) => e.player && e.type === 'character')
                    .filter((e) => e.ctype !== 'merchant')
                //                    .sort((a, b) => b.pdps - a.pdps)
            }, [entities])

            const parties = React.useMemo(() => {
                const result = {}

                players.forEach((player) => {
                    result[player.party || ''] = result[player.party || ''] || []
                    result[player.party || ''].push(player)
                })

                return Object.entries(result)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([id, ps]) => ([id, ps.sort((a, b) => a.id.localeCompare(b.id))]))
            }, [players])

            return e(
                'div',
                {
                    style: {
                        padding: '4px',
                        display: 'flex',
                        gap: '4px',
                        flexDirection: 'column',
                    }
                },
                parties.map((party) => e(
                    'div',
                    {
                        key: party[0],
                        style: {
                            display: 'flex',
                            gap: '4px',
                            flexWrap: 'wrap',
                        },
                    },
                    e(
                        'div',
                        { style: { flex: '0 0 100%' } },
                        e('span', { style: { color: 'white', padding: '4px', background: 'black' } }, party[0] || '(no party)'),
                    ),
                    party[1].map((player) => e(
                        'div',
                        {
                            key: player.id,
                            className: 'player',
                            style: {
                                display: 'flex',
                                width: '120px',
                                background: 'black',
                                flexDirection: 'column',
                            }
                        },
                        e(
                            'div',
                            { style: { position: 'relative' } },
                            e(
                                'div',
                                { style: {
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    width: getPercent(player.hp / player.max_hp),
                                    background: classColors[player.ctype],
                                } },
                            ),
                            e(
                                'div',
                                { style: {
                                    padding: '2px',
                                    whiteSpace: 'nowrap',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    textShadow: '0 0 2px black',
                                    cursor: 'pointer',
                                }, onClick: () => props.setSelectedEntity(player.id) },
                                `${player.level} ${player.id}`
                            ),
                        ),
                        e(
                            'div',
                            {
                                style: {
                                    background: 'blue',
                                    height: '4px',
                                    width: getPercent(player.mp / player.max_mp),
                                },
                            },
                        ),
                    ))
                ))
            )
        }

        const ServerInfo = (props) => {
            const serverInfo = useServerInfo()

            const timeOffset = serverInfo.S?.schedule?.time_offset ?? 0
            const spawns = Object.entries(serverInfo.S ?? {}).filter((entry) => entry[1]?.live || entry[1]?.spawn)

            return [
                e(
                    'div',
                    { key: 'content', style: {
                        display: 'flex',
                        gap: '4px',
                    } },
                    e(
                        'div',
                        { style: {
                            background: 'black',
                            border: '2px double gray',
                            padding: '4px',
                        } },
                        `${serverInfo.serverRegion ?? ''} ${serverInfo.serverIdentifier ?? ''}`,
                        e('br'),
                        // `UTC${timeOffset >= 0 ? '+' : ''}${timeOffset}`,
                        // e('br'),
                        new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: timeZones[timeOffset]}),
                        // serverInfo.S?.schedule?.night ? '🌛' : '☀️',
                    ),
                    spawns.map((spawn) => e(
                        'div',
                        { key: spawn[0], style: {
                            background: 'black',
                            border: '2px double gray',
                            padding: '4px',
                        } },
                        spawn[0],
                        e('br'),
                        spawn[1].live ? 'live' : getTimeUntil(spawn[1].spawn),
                    )),
                ),
                // e('pre', { key: 'raw' }, JSON.stringify(serverInfo, null, 2)),
            ]
        }

        const BossInfo = (props) => {
            const entities = useEntities()

            const bosses = React.useMemo(() => {
                // return entities.filter((e) => e.hp !== e.max_hp).slice(0, 2)
                return entities.filter((e) => e.cooperative === true)
            }, [entities])

            return bosses.map((boss) => e(
                'div',
                {
                    key: boss.id,
                    style: {
                        display: 'flex',
                        width: '100%',
                        flexDirection: 'column',
                    }
                },
                e(
                    'div',
                    { style: {
                        background: 'black',
                        position: 'relative',
                    } },
                    e(
                        'div',
                        { style: {
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            width: getPercent(boss.hp / boss.max_hp),
                            background: 'red',
                        } },
                    ),
                    e(
                        'div',
                        { style: {
                            fontSize: '24px',
                            padding: '4px',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            position: 'relative',
                            textShadow: '0 0 2px black',
                            cursor: 'pointer',
                        }, onClick: () => props.setSelectedEntity(boss.id) },
                        `${boss.level ?? 1} ${boss.name} #${boss.id}`,
                    ),
                ),
                e(
                    'div',
                    { style: {
                        background: 'black',
                    }},
                    e(
                        'div',
                        { style: {
                            background: 'blue',
                            height: '4px',
                            width: getPercent(boss.mp / boss.max_mp),
                        } },
                    ),
                ),
                e(
                    'div',
                    { style: {
                        display: 'flex',
                        marginBottom: '4px',
                        gap: '2px',
                    } },
                    Object.entries(boss.s ?? {}).map((s) => e(
                        'div',
                        { key: s[0], style: {
                            background: 'black',
                            padding: '2px',
                        } },
                        s[0],
                        s[1].ms ? ` (${formatTime(s[1].ms / 1000)})` : undefined,
                    )),
                ),
            ))
        }

        const Enemies = (props) => {
            const entities = useEntities()

            const enemies = React.useMemo(() => {
                return entities
                    .filter((e) => e.type === 'monster' && e.cooperative !== true)
                    .filter((e) => e.target)
            }, [entities])

            return e(
                'div',
                { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    paddingTop: '4px',
                } },
                enemies.map((enemy) => e(
                    'div',
                    {
                        key: enemy.id,
                        style: {
                            display: 'flex',
                            width: '100%',
                            flexDirection: 'column',
                            textAlign: 'left',
                        }
                    },
                    e(
                        'div',
                        { style: {
                            background: 'black',
                            position: 'relative',
                        } },
                        e(
                            'div',
                            { style: {
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                width: getPercent(enemy.hp / enemy.max_hp),
                                background: 'red',
                            } },
                        ),
                        e(
                            'div',
                            { style: {
                                padding: '4px',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                position: 'relative',
                                textShadow: '0 0 2px black',
                                cursor: 'pointer',
                            }, onClick: () => props.setSelectedEntity(enemy.id) },
                            `${enemy.level ?? 1} ${enemy.name} #${enemy.id}`,
                        ),
                    ),
                    e(
                        'div',
                        { style: {
                            background: 'black',
                        }},
                        e(
                            'div',
                            { style: {
                                background: 'blue',
                                height: '4px',
                                width: getPercent(enemy.mp / enemy.max_mp),
                            } },
                        ),
                    ),
                    /*e(
                    'div',
                    { style: {
                        display: 'flex',
                        marginBottom: '4px',
                        gap: '2px',
                    } },
                    Object.entries(enemy.s ?? {}).map((s) => e(
                        'div',
                        { style: {
                            background: 'black',
                            padding: '2px',
                        } },
                        s[0],
                        s[1].ms ? ` (${formatTime(s[1].ms / 1000)})` : undefined,
                    )),
                ),*/
                )),
            )
        }

        const EntityInfo = (props) => {
            const entities = useEntities()
            const entity = React.useMemo(() => entities.find((e) => e.id === props.selectedEntity), [entities])

            if (!entity) {
                return
            }

            return e(
                'span',
                { style: {
                    display: 'inline-flex',
                    overflow: 'auto',
                    flexDirection: 'column',
                    margin: '4px',
                    border: '2px double gray',
                    background: 'black',
                    gap: '2px',
                    padding: '4px',
                } },
                e('div', {}, `${entity.level ?? 1} ${entity.name}${entity.type === 'monster' ? ` #${entity.id}` : ''}`),
                entity.age ? e('div', {}, `Age: ${entity.age}`) : undefined,
                entity.party ? e('div', {}, `Party: ${entity.party}`) : undefined,
                e('br'),
                entity.heal ? e('div', {}, `Heal: ${entity.heal}`) : undefined,
                entity.attack ? e('div', {}, `Attack: ${entity.attack} ${entity?.damage_type ?? ''}`) : undefined,
                e('div', {}, `Armor: ${entity.armor ?? 0}`),
                e('div', {}, `Resistance: ${entity.resistance ?? 0}`),
                e('br'),
                entity.speed ? e('div', {}, `Speed: ${entity.speed}`) : undefined,
                entity.frequency ? e('div', {}, `Frequency: ${entity.frequency.toFixed(2)}`) : undefined,
            )
        }

        const Player = (props) => {
            const character = useObservingCharacter()
            const target = useObservingCharacterTarget()

            return e(
                'div',
                { style: {
                    display: 'flex',
                    gap: '16px',
                } },
                e(
                    'div',
                    { style: {
                        width: '60%',
                    } },
                    character
                    ? e(
                        'div',
                        {
                            style: {
                                display: 'flex',
                                width: '100%',
                                flexDirection: 'column',
                            }
                        },
                        e(
                            'div',
                            { style: {
                                background: 'black',
                                position: 'relative',
                            } },
                            e(
                                'div',
                                { style: {
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    width: getPercent(character.hp / character.max_hp),
                                    background: classColors[character.ctype],
                                } },
                            ),
                            e(
                                'div',
                                { style: {
                                    fontSize: '24px',
                                    padding: '4px',
                                    whiteSpace: 'nowrap',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    textShadow: '0 0 2px black',
                                    cursor: 'pointer',
                                }, onClick: () => props.setSelectedEntity(character.id) },
                                `${character.level ?? 1} ${character.name}`,
                            ),
                        ),
                        e(
                            'div',
                            { style: {
                                background: 'black',
                            }},
                            e(
                                'div',
                                { style: {
                                    background: 'blue',
                                    height: '4px',
                                    width: getPercent(character.mp / character.max_mp),
                                } },
                            ),
                        ),
                    )
                    : undefined,
                ),
                e(
                    'div',
                    { style: {
                        width: '40%',
                    } },
                    target
                    ? e(
                        'div',
                        {
                            style: {
                                display: 'flex',
                                width: '100%',
                                flexDirection: 'column',
                            }
                        },
                        e(
                            'div',
                            { style: {
                                background: 'black',
                                position: 'relative',
                            } },
                            e(
                                'div',
                                { style: {
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    width: getPercent(target.hp / target.max_hp),
                                    background: classColors[target.ctype] ?? 'red',
                                } },
                            ),
                            e(
                                'div',
                                { style: {
                                    fontSize: '24px',
                                    padding: '4px',
                                    whiteSpace: 'nowrap',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    textShadow: '0 0 2px black',
                                    cursor: 'pointer',
                                }, onClick: () => props.setSelectedEntity(target.id) },
                                `${target.level ?? 1} ${target.name}${target.type === 'monster' ? ` #${target.id}` : ''}`,
                            ),
                        ),
                        e(
                            'div',
                            { style: {
                                background: 'black',
                            }},
                            e(
                                'div',
                                { style: {
                                    background: 'blue',
                                    height: '4px',
                                    width: getPercent(target.mp / target.max_mp),
                                } },
                            ),
                        ),
                    )
                    : undefined,
                ),
            )
        }

        const DamageMeter = (props) => {
            const entities = useEntities()

            const players = React.useMemo(() => {
                return entities
                    .filter((e) => e.player && e.type === 'character')
                    .filter((e) => e.ctype !== 'merchant')
                    .filter((e) => e.pdps > 0)
                    .sort((a, b) => b.pdps - a.pdps)
            }, [entities])

            const maxPdps = React.useMemo(() => Math.max(...players.map((p) => p.pdps)), [players])

            if (!maxPdps || players.length === 0) {
                return
            }

            return e(
                'div',
                { style: {
                    display: 'flex',
                    overflow: 'auto',
                    flexDirection: 'column',
                    margin: '4px',
                    border: '2px double gray',
                    background: 'black',
                    gap: '2px',
                } },
                players.map((player) => e(
                    'div',
                    { key: player.id, style: {
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                    } },
                    e(
                        'div',
                        { style: {
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            width: getPercent(player.pdps / maxPdps),
                            background: classColors[player.ctype],
                        } },
                    ),
                    e(
                        'div',
                        { style: {
                            padding: '2px',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            textShadow: '0 0 2px black',
                            position: 'relative',
                        } },
                        `${player.name}`
                    ),
                    e(
                        'div',
                        { style: {
                            padding: '2px',
                            whiteSpace: 'nowrap',
                            textShadow: '0 0 2px black',
                            position: 'relative',
                        } },
                        `${(player.pdps).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    ),
                ))
            )
        }

        const CommUI = (props) => {
            const [selectedEntity, setSelectedEntity] = React.useState(undefined)

            return e(
                'div',
                { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%',
                } },
                e(
                    'div',
                    { style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                    } },
                    e(
                        'div',
                        { style: {
                            width: '376px',
                        } },
                        e(Players, { setSelectedEntity }),
                    ),
                    e(
                        'div',
                        { style: {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            flex: 1,
                            padding: '4px 16px',
                        } },
                        e(ServerInfo),
                        e(BossInfo, { setSelectedEntity }),
                    ),
                    e(
                        'div',
                        { style: {
                            width: 'calc(376px - 134px)',
                            textAlign: 'right',
                            paddingRight: '134px',
                        } },
                        e(Enemies, { setSelectedEntity }),
                    ),
                ),
                e(
                    'div',
                    { style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                    } },
                    e(
                        'div',
                        { style: {
                            width: '376px',
                            paddingBottom: '28px',
                        } },
                        e(EntityInfo, { selectedEntity }),
                    ),
                    e(
                        'div',
                        { style: {
                            flex: '1 1 0%',
                            padding: '4px 16px 168px',
                        } },
                        e(Player, { setSelectedEntity }),
                    ),
                    e(
                        'div',
                        { style: {
                            width: '376px',
                            paddingBottom: '36px',
                        } },
                        e(DamageMeter),
                    ),
                ),
            )
        }

        let domContainer = document.querySelector('#comm-ui')
        if (!domContainer) {
            domContainer = document.createElement('div')
            domContainer.id = 'comm-ui'
            domContainer.style.zIndex = 10
            domContainer.style.position = 'fixed'
            domContainer.style.width = '100%'
            domContainer.style.height = '100%'
            document.body.append(domContainer)
        }

        const root = ReactDOM.createRoot(domContainer)
        root.render(e(CommUI))
    }

    if (!document.querySelector('#react')) {
        const reactScript = document.createElement('script')
        reactScript.id = 'react'
        reactScript.src = 'https://unpkg.com/react@18/umd/react.development.js'
        reactScript.crossOrigin = ''
        document.head.append(reactScript)
    }

    if (!document.querySelector('#react-dom')) {
        const reactDomScript = document.createElement('script')
        reactDomScript.id = 'react-dom'
        reactDomScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.development.js'
        reactDomScript.crossOrigin = ''
        reactDomScript.addEventListener('load', onLoad)
        document.head.append(reactDomScript)
    }

    /*
    if (!document.querySelector('#comm-ui-css')) {
        const style = document.createElement('style')
        style.id = 'react-dom'
        style.innerText = `
progress.comm-ui-hp-bar {
  border-radius: 0;
  height: 1em;
}
progress.comm-ui-hp-bar::-webkit-progress-bar {
  background-color: gray;
}
progress.comm-ui-hp-bar::-webkit-progress-value {
  background-color: red;
}
progress.comm-ui-mp-bar {
  border-radius: 0;
  height: 1em;
}
progress.comm-ui-mp-bar::-webkit-progress-bar {
  background-color: gray;
}
progress.comm-ui-mp-bar::-webkit-progress-value {
  background-color: blue;
}
`
        document.head.append(style)
    }
    */
})();
