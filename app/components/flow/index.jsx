import React, { Component, PropTypes } from 'react'
import { ELEMENT_STATUS_ACTIVE, MOVE_VIEW, MOVE_ELEMENT, MOVE_LINE, GRAPH_STATUS_LINK, GRAPH_STATUS_EDIT, ELEMENT_TYPE_CONNECTOR, GRAPH_STATUS_MOVE, ELEMENT_TYPE_EVENT, GRAPH_STATUS_READONLY } from './common/constants'
import { parseGraphByJSONData, handleElementOptions, createMoveModel, calcNewAxis, getElementByEvent, zoom, validateGraph, updateGraph, handleGraphOption, reset } from './logics/graph_logic'
import { isActiveElement, moveElement, createElement, deleteElement } from './logics/element_logic'
import { drawConnector, handleDrawConnectorComplete } from './logics/line_logic'
import ControllerFactory from './controllers/controller_factory'
import MoveModel from './models/move_model'
import './flow.less'
const markerProps = {
    viewBox: '0 0 10 10',
    refX: 10,
    refY: 5,
    markerWidth: 6,
    markerHeight: 6,
    orient: 'auto'
}
class FlowContainer extends Component {
    static childContextTypes = {
        graph: PropTypes.object
    }
    static propTypes = {
        startText: PropTypes.string,
        overText: PropTypes.string,
        data: PropTypes.string,
        height: PropTypes.string,
        readOnly: PropTypes.bool,
        onBeforeRender: PropTypes.func,
        onSelect: PropTypes.func,
        onDelete: PropTypes.func
    }
    static defaultProps = {
        startText: 'start',
        overText: 'over',
        height: '500',
        readOnly: false,
        onBeforeRender: () => {},
        onSelect: () => {},
        onDelete: () => {}
    }
    state = {
        graph: null,
        selectedElements: []
    }
    move = null
    onClick(e) {
        if (this.move && this.move.active) {
            return
        }
        let { selectedElements, graph } = this.state
        let element = getElementByEvent(e.nativeEvent, graph)
        if (element) {
            if ((e.nativeEvent.shiftKey || e.nativeEvent.ctrlKey) && element.type !== ELEMENT_TYPE_CONNECTOR) {
                if (selectedElements.findIndex(ele => ele.id == element.id) !== -1) {
                    selectedElements = selectedElements.filter(ele => ele.id != element.id)
                } else {
                    selectedElements.push(element)
                }
            } else {
                selectedElements = [element]
            }
        } else {
            selectedElements = []
            this.props.onSelect(undefined)
        }
        this.setState({ selectedElements })
    }
    onDoubleClick() {
        let element = this.state.selectedElements[0]
        if (!element) {
            return
        }
        if (element.type == ELEMENT_TYPE_EVENT) {
            element = undefined
        }
        this.props.onSelect(element)
    }
    onMouseDown(e) {
        let { graph } = this.state
        this.move = createMoveModel(e.nativeEvent, this.state.graph)
        if (!this.move) {
            return
        }
        if (this.move.type == MOVE_LINE) {
            graph.status = GRAPH_STATUS_LINK
        } else if (this.move.type == MOVE_ELEMENT) {
            graph.status = GRAPH_STATUS_MOVE
        }
        this.setState({ graph })
    }
    onMouseMove(e) {
        if (!this.move) return
        // 开启移动中状态
        if (!this.move.active) {
            this.move.active = true
            // 将移动中的节点提升到最上面
            if (this.move.node && this.move.type != MOVE_LINE) {
                this.refs.layer.appendChild(this.move.node)
            }
        }
        let { graph } = this.state
        let { end, type } = this.move
        end.x = e.clientX
        end.y = e.clientY
        let newAxis = calcNewAxis(this.move, graph.scale)
        switch (type) {
            case MOVE_VIEW:
                graph = Object.assign({}, graph, newAxis)
                this.setState({ graph })
                break
            case MOVE_ELEMENT:
                moveElement(this.move, graph, newAxis)
                break
            case MOVE_LINE:
                drawConnector(this.move)
                break
        }
    }
    onMouseUp(e) {
        if (!this.move) {
            return
        }
        let { graph } = this.state
        if (this.move.type == MOVE_LINE) {
            this.move.node.setAttribute('points', '')
            handleDrawConnectorComplete(e.nativeEvent, this.move, graph)
        }
        if (graph.status != GRAPH_STATUS_EDIT) {
            graph.status = this.props.readOnly ? GRAPH_STATUS_READONLY : GRAPH_STATUS_EDIT
            reset(graph)
            this.setState({ graph })
        }
        this.move = null
    }
    onKeyUp(e) {
        let code = e.keyCode || e.which
        if (code == 8 || code == 46) {
            e.preventDefault()
            this.delete()
        }
    }
    onWheel(e) {
        e.preventDefault()
        let { graph } = this.state
        zoom(e.nativeEvent, graph)
        this.setState({ graph })
    }
    render() {
        let { graph, selectedElements } = this.state
        let { x, y, status, height, scale } = graph
        let events = {
            onClick: this.onClick.bind(this),
            onDoubleClick: this.onDoubleClick.bind(this),
            onMouseMove: this.onMouseMove.bind(this),
            onMouseDown: this.onMouseDown.bind(this),
            onMouseUp: this.onMouseUp.bind(this),
            onKeyUp: this.onKeyUp.bind(this),
            onWheel: this.onWheel.bind(this)
        }
        return (
            <svg ref="svg" className={'graph ' + status} width="100%" height={height} tabIndex="-1" {...events}>
                <defs>
                    <marker id="triangle-default" className="marker" {...markerProps}>
                        <path d="M 0 0 L 10 5 L 0 10 z" />
                    </marker>
                    <marker id="triangle-disabled" className="marker disabled" {...markerProps}>
                        <path d="M 0 0 L 10 5 L 0 10 z" />
                    </marker>
                    <marker id="triangle-success" className="marker success" {...markerProps}>
                        <path d="M 0 0 L 10 5 L 0 10 z" />
                    </marker>
                    <marker id="triangle-process" className="marker process" {...markerProps}>
                        <path d="M 0 0 L 10 5 L 0 10 z" />
                    </marker>
                    <marker id="triangle-pause" className="marker pause" {...markerProps}>
                        <path d="M 0 0 L 10 5 L 0 10 z" />
                    </marker>
                    <marker id="triangle-error" className="marker error" {...markerProps}>
                        <path d="M 0 0 L 10 5 L 0 10 z" />
                    </marker>
                </defs>
                <g ref="layer" className="layer" transform={`translate(${x},${y}),scale(${scale})`}>
                    {graph.elements.map(element => {
                        const Controller = ControllerFactory.create(element.type)
                        return Controller ? <Controller key={element.id} element={element} active={isActiveElement(element, selectedElements)} /> : null
                    })}
                </g>
                <g id="flowGuideLine" className="element element-connector dashed">
                    <polyline />
                </g>
            </svg>
        )
    }
    getChildContext() {
        return { graph: this.state.graph }
    }
    shouldComponentUpdate(nextProps, nextState) {
        return this.state != nextState
    }
    componentWillMount() {
        let { data, height, startText, overText, readOnly } = this.props
        // 回传一个更新方法交给上一层，可以省略掉事件
        this.props.onBeforeRender(this.handle.bind(this))
        this.state.graph = parseGraphByJSONData(data, height, startText, overText)
        this.state.graph.status = readOnly ? GRAPH_STATUS_READONLY : GRAPH_STATUS_EDIT
    }
    delete() {
        let { selectedElements, graph } = this.state
        if (this.props.readOnly) {
            return
        }
        if (!selectedElements.length) {
            return
        }
        let elements = selectedElements.filter(element => element.type !== ELEMENT_TYPE_EVENT)
        elements.forEach(element => deleteElement(element, graph))
        reset(graph)
        this.props.onDelete(elements)
        this.setState({ graph })
    }
    /**
     * 根据传递的选项数据进行更新
     * option数据结构
     * {
     *      type: OPTION_ELEMENT_CREATE, // 操作类型
     *      data: {} // 操作数据，当进行图形校验和图形数据获取的时候data是回调函数
     * }
     * data数据结构
     * {
     *      id: '', // 节点ID，操作图形数据时无ID信息
     *      field: '', // 字段名称
     *      value: '' // 字段的新值
     * }
     * @param {Array|Object} option 选项数据,如果为数组则操作节点
     */
    handle(option, callback) {
        let { graph, selectedElements } = this.state
        if (option instanceof Array) {
            handleElementOptions(option, graph, selectedElements)
        } else {
            handleGraphOption(option, graph)
        }
        this.setState({ graph })
    }
}

export default FlowContainer
