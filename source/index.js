import * as helper from "./helper";
import React, { Component, memo, useMemo, useRef } from "react";
import {
  StyleSheet,
  PanResponder,
  View,
  Text,
  Dimensions,
  I18nManager,
} from "react-native";
import Line from "./line";
import Circle from "./circle";
import PropTypes from "prop-types";

const Width = Dimensions.get("window").width;
const Height = Dimensions.get("window").height;

export default class GesturePassword extends Component {
  constructor(props) {
    super(props);

    this.timer = null;
    this.lastIndex = -1;
    this.sequence = ""; // 手势结果
    this.isMoving = false;

    // getInitialState
    let circles = this.getCircles(props)||[];
    this.state = {
      circles: circles,
      lines: [],
      pageX:0,
      pageY:0,
    };
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if(this.props.width != nextProps.width) {
      this.setState({circles:this.getCircles(nextProps)})
    }
  }
  getCircles(props) {
    let {width, height} = props;
    if(!width) width = Width;
    if(!height) height = Width;
    const radius =  width / 10;

    let margin = radius;
    const circles = [];
    for (let i = 0; i < 9; i++) {
      let p = i % 3;
      let q = parseInt(i / 3);
      circles.push({
        isActive: false,
        x: p * (radius * 2 + radius) + margin + radius,
        y: q * (radius * 2 + radius) + margin + radius,
        r: radius,
      });
    }
    return circles;
  }

  onLayout(e, ref) {
    setTimeout(()=>{
      ref.current?.measure((x,y,width,height,pageX,pageY)=>{
        this.setState({pageX,pageY});
      });
    }, 500);
  }
  _panResponder = PanResponder.create({
    // 要求成为响应者：

    onStartShouldSetPanResponder: (event, gestureState) => true,
    onStartShouldSetPanResponderCapture: (event, gestureState) => true,
    onMoveShouldSetPanResponder: (event, gestureState) => true,
    onMoveShouldSetPanResponderCapture: (event, gestureState) => true,

    // 开始手势操作
    onPanResponderGrant: (e, g) => this.onStart(e, g),
    // 移动操作
    onPanResponderMove: (e, g) => this.onMove(e, g),
    // 释放手势
    onPanResponderRelease: (e, g) => this.onEnd(e, g),
  });

  render() {
    let color =
      this.props.status === "wrong"
        ? this.props.wrongColor
        : this.props.rightColor;

    const {
      textStyle,
      style,
      status,
      message,
      normalColor,
      wrongColor,
      rightColor,
      innerCircle,
      outerCircle,
      transparentLine,
      children,
      messageStyle,
      boardStyle,
    } = this.props;

    return (
      <Container
        messageStyle={messageStyle}
        boardStyle={boardStyle}
        textStyle={textStyle}
        style={style}
        status={status}
        message={this.state.message || message}
        wrongColor={wrongColor}
        rightColor={rightColor}
        panHandlers={this._panResponder.panHandlers}
        userAddedChildren={children}
        onLayout={(e,ref)=>this.onLayout(e,ref)}
      >
        <Circles
          circles={this.state.circles}
          status={status}
          normalColor={normalColor}
          wrongColor={wrongColor}
          rightColor={rightColor}
          innerCircle={innerCircle}
          outerCircle={outerCircle}
        />
        <Lines
          lines={this.state.lines}
          status={status}
          wrongColor={wrongColor}
          rightColor={rightColor}
          transparentLine={transparentLine}
        />
        <Line ref="line" color={transparentLine ? "#00000000" : color} />
      </Container>
    );
  }

  setActive(index) {
    this.state.circles[index].isActive = true;

    let circles = [...this.state.circles];
    this.setState({ circles });
  }

  resetActive() {
    this.state.lines = [];
    for (let i = 0; i < 9; i++) {
      this.state.circles[i].isActive = false;
    }

    let circles = [...this.state.circles];
    this.setState({ circles });
    this.props.onReset && this.props.onReset();
  }

  getTouchChar(touch) {
    let x = touch.x;
    let y = touch.y;

    for (let i = 0; i < 9; i++) {
      const c = this.state.circles[i];
      if (helper.isPointInCircle({ x, y }, c, c.r)) {
        return String(i);
      }
    }

    return false;
  }

  getCrossChar(char) {
    let middles = "13457",
      last = String(this.lastIndex);

    if (middles.indexOf(char) > -1 || middles.indexOf(last) > -1) return false;

    let point = helper.getMiddlePoint(
      this.state.circles[last],
      this.state.circles[char],
    );

    for (let i = 0; i < middles.length; i++) {
      let index = middles[i];
      if (helper.isEquals(point, this.state.circles[index])) {
        return String(index);
      }
    }

    return false;
  }

  onStart = (e, g) => {
    this.sequence = "";
    this.lastIndex = -1;
    this.isMoving = false;

    let x = e.nativeEvent.pageX - this.state.pageX;
    let y = e.nativeEvent.pageY - this.state.pageY;

    console.log('###$$$onStart',e.nativeEvent.pageX,this.state.pageX)

    let lastChar = this.getTouchChar({ x, y });

    if (lastChar) {
      this.isMoving = true;
      this.lastIndex = Number(lastChar);
      this.sequence = lastChar;
      this.resetActive();
      this.setActive(this.lastIndex);

      let point = {
        x: this.state.circles[this.lastIndex].x,
        y: this.state.circles[this.lastIndex].y,
      };

      this.refs.line.setNativeProps({ start: point, end: point });

      this.props.onStart && this.props.onStart();

      if (this.props.interval > 0) {
        clearTimeout(this.timer);
      }

    }
  };

  onMove = (e, g) => {
    if (this.isMoving) {
      let x = e.nativeEvent.pageX - this.state.pageX;
      let y = e.nativeEvent.pageY - this.state.pageY;

      this.refs.line.setNativeProps({ end: { x, y } });

      let lastChar = null;
      const lastCircle = this.state.circles[this.lastIndex];
      if (
        !helper.isPointInCircle(
          { x, y },
          lastCircle,
          lastCircle.r,
        )
      ) {
        lastChar = this.getTouchChar({ x, y });
      }

      if (lastChar && this.sequence.indexOf(lastChar) === -1) {
        if (!this.props.allowCross) {
          let crossChar = this.getCrossChar(lastChar);

          if (crossChar && this.sequence.indexOf(crossChar) === -1) {
            this.sequence += crossChar;
            this.setActive(Number(crossChar));
          }
        }

        let lastIndex = this.lastIndex;
        let thisIndex = Number(lastChar);

        this.state.lines = [
          ...this.state.lines,
          {
            start: {
              x: this.state.circles[lastIndex].x,
              y: this.state.circles[lastIndex].y,
            },
            end: {
              x: this.state.circles[thisIndex].x,
              y: this.state.circles[thisIndex].y,
            },
          },
        ];

        this.lastIndex = thisIndex;
        this.sequence += lastChar;

        this.setActive(this.lastIndex);

        let point = {
          x: this.state.circles[this.lastIndex].x,
          y: this.state.circles[this.lastIndex].y,
        };

        this.refs.line.setNativeProps({ start: point });
      }
    }

    if (this.sequence.length === 9) this.onEnd();
  };

  onEnd = (e, g) => {
    const password = helper.getRealPassword(this.sequence);

    this.sequence = "";
    this.lastIndex = -1;
    this.isMoving = false;

    let origin = { x: 0, y: 0 };
    this.refs.line.setNativeProps({ start: origin, end: origin });

    this.props.onEnd && this.props.onEnd(password);

    if (this.props.interval > 0) {
      this.timer = setTimeout(() => this.resetActive(), this.props.interval);
    }
  };
}

GesturePassword.propTypes = {
  message: PropTypes.string,
  normalColor: PropTypes.string,
  rightColor: PropTypes.string,
  wrongColor: PropTypes.string,
  status: PropTypes.oneOf(["right", "wrong", "normal"]),
  onStart: PropTypes.func,
  onEnd: PropTypes.func,
  onReset: PropTypes.func,
  interval: PropTypes.number,
  allowCross: PropTypes.bool,
  innerCircle: PropTypes.bool,
  outerCircle: PropTypes.bool,
};

GesturePassword.defaultProps = {
  message: "",
  normalColor: "#5FA8FC",
  rightColor: "#5FA8FC",
  wrongColor: "#D93609",
  status: "normal",
  interval: 0,
  allowCross: false,
  innerCircle: true,
  outerCircle: true,
};

const Container = memo(
  ({
    messageStyle,
    boardStyle,
    textStyle,
    style,
    status,
    message,
    wrongColor,
    rightColor,
    panHandlers,
    children,
    userAddedChildren,
    onLayout
  }) => {
    let color = status === "wrong" ? wrongColor : rightColor;

    const _styleContainer = useMemo(() => [styles.frame, style], [style]);

    const _styleText = useMemo(
      () => [styles.msgText, textStyle, { color: color }],
      [textStyle, color],
    );
    
    const boardRef = useRef(null);
    
    return (
      <View style={_styleContainer}>
        <View style={[styles.message,messageStyle]}>
          <Text style={_styleText}>{message}</Text>
        </View>
        <View style={[styles.board,boardStyle]} {...panHandlers} ref={boardRef} onLayout={(e)=>onLayout(e, boardRef)}>
          {children}
        </View>
        {userAddedChildren}
      </View>
    );
  },
);

const Lines = memo(
  ({ lines, status, wrongColor, rightColor, transparentLine }) => {
    let color;

    return lines.map(function(l, i) {
      color = status === "wrong" ? wrongColor : rightColor;
      color = transparentLine ? "#00000000" : color;

      return <Line key={"l_" + i} color={color} start={l.start} end={l.end} />;
    });
  },
);

const Circles = memo(
  ({
    circles,
    status,
    normalColor,
    wrongColor,
    rightColor,
    innerCircle,
    outerCircle,
  }) => {
    let fill, color, inner, outer;

    return circles.map(function(c, i) {
      fill = c.isActive;
      color = status === "wrong" ? wrongColor : rightColor;
      inner = !!innerCircle;
      outer = !!outerCircle;

      return (
        <Circle
          key={"c_" + i}
          fill={fill}
          normalColor={normalColor}
          color={color}
          x={c.x}
          y={c.y}
          r={c.r}
          inner={inner}
          outer={outer}
        />
      );
    });
  },
);

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    backgroundColor: "#292B38",
  },
  board: {
    flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
    position: "absolute",
    left: 0,
    top: 50,
    width: Width,
    height: Height,
  },
  message: {
    position: "absolute",
    left: 0,
    top: 10,
    width: Width,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  msgText: {
    fontSize: 14,
  },
});

module.exports = GesturePassword;
