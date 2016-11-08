import React from 'react';
import {Circle, Group} from 'react-konva';
import BasicEvent from './BasicEvent';
export default class StartEvent extends BasicEvent {
    static defaultProps = {
        x: 30,
        y: 30,
        radius: 30
    }
    componentWillMount() {
        this.state.background = '#66c484';
    }
}