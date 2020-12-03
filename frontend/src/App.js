import React from 'react';
import './App.css';
import { Button, Switch, Steps, Slider, Descriptions, PageHeader, Tag } from 'antd';
import { UserOutlined, SolutionOutlined, LoadingOutlined, SmileOutlined } from '@ant-design/icons';

const { Step } = Steps;

class App extends React.Component {
  state = {
    status: "idle",
    pure: "close",
    waste: "close",
    salt: "close",
    wasteTime: 180,
    refillTime: 600,
  };

  componentDidMount() {
    this.getStatus();
    this.interval = setInterval(() => this.getStatus(), 1000);
  }

  getStatus = () => {
    fetch("/api/status")
      .then(response => response.json())
      .then(response => {
        console.log(response);
        this.setState({ 
          status: response.status,
          temperature: response.temperature,
          pure: response.valve.pure,
          waste: response.valve.waste,
          salt: response.valve.salt,
          remainWasteTime: response.remainWasteTime,
          remainRefillTime: response.remainRefillTime
        });
      });
  }

  toggleWaterValve = (name) => {
    fetch("/api/valve?name=" + name, {
      method:"POST"
    })
      .then(response => {
        this.getStatus();
      });
  }

  enterTimerChange = () => {
    fetch("/api/preset", {
      method:"POST",
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        action: "timerchange",
        wasteTime: this.state.wasteTime,
        refillTime: this.state.refillTime
      })
    })
      .then(response => {
        console.log(response);
        this.getStatus();
      });
  }

  wasteTimeValue = (value) => {
    this.setState({
      wasteTime: value
    });
  }

  refillTimeValue = (value) => {
    this.setState({
      refillTime: value
    });
  }

  render() {
    var pure = false;
    var waste = false;
    var salt = false;

    if(this.state.pure === "open"){
      pure = true;
    }

    if(this.state.waste === "open"){
      waste = true;
    }

    if(this.state.salt === "open"){
      salt = true;
    }

    var timer = <div></div>;
    var inputDisable = false;
    var autoWorking = false;

    if(this.state.status === "timerchange"){
      inputDisable = true;
      autoWorking = true;

      let currentAutoTimer = 0;
      if(parseInt(this.state.remainWasteTime) > 0){
        currentAutoTimer = 0;
      }
      else if(parseInt(this.state.remainRefillTime) > 0){
        currentAutoTimer = 1;
      }
      else{
        currentAutoTimer = 2;
      }

      timer = <Descriptions.Item>
          <Steps current={currentAutoTimer}>
            <Step title="배수" subTitle={this.state.remainWasteTime + "초"} />
            <Step title="해수 보충" subTitle={this.state.remainRefillTime + "초"} />
          </Steps>,
        </Descriptions.Item>;
    }
    else if(this.state.status === "idle"){
      inputDisable = false;
      autoWorking = false;
    }
    else if(this.state.status === "empty"){
      inputDisable = true;
      autoWorking = false;
    }

    const marks = {
      60: '1분',
      180: '3분',
      300: {
        style: {
          color: '#f50',
        },
        label: <strong>5분</strong>,
      }
    };

    const refillMarks = {
      60: '1분',
      300: '5분',
      600: '10분',
      1200: '20분',
      1800: {
        style: {
          color: '#f50',
        },
        label: <strong>30분</strong>,
      }
    };

    var tempColor = "success";

    console.log(parseFloat(this.state.temperature));

    if(parseFloat(this.state.temperature) > 27.0 || parseFloat(this.state.temperature) < 25.0){
      tempColor = "error";
    }

    return (
      <div className="App">
        <header className="App-header">
        <PageHeader
      ghost={false}
      title="Aquabot"
      subTitle="Automated aquarium management system"
      extra={[
        <Tag color={tempColor}>{this.state.temperature}도</Tag>,
        <Switch checkedChildren="정수기 급수 중" unCheckedChildren="정수기 급수 막힘" checked={pure} onClick={() => this.toggleWaterValve("pure")} />,
        <Switch checkedChildren="폐수 열림" unCheckedChildren="폐수 막힘" checked={waste} onClick={() => this.toggleWaterValve("waste")} />,
        <Switch checkedChildren="해수 열림" unCheckedChildren="해수 막힘" checked={salt} onClick={() => this.toggleWaterValve("salt")} />,
      ]}
    >
        <Descriptions size="small" column={1}>
          <Descriptions.Item label="타이머 자동 배수 시간">
            <Slider style={{width:"300px"}} marks={marks} step={10} min={10} max={300} defaultValue={180} disabled={inputDisable} onChange={this.wasteTimeValue} />
          </Descriptions.Item>
          <Descriptions.Item label="타이머 자동 보충 시간">
            <Slider style={{width:"300px"}} marks={refillMarks} step={10} min={60} max={1800} defaultValue={600} disabled={inputDisable} onChange={this.refillTimeValue} />
          </Descriptions.Item>
          <Descriptions.Item>
            <Button type="primary" size="small" loading={autoWorking} onClick={() => this.enterTimerChange()}>
              Timer Change
            </Button>
          </Descriptions.Item>
          {timer}
        </Descriptions>
       </PageHeader>
       </header>
      </div>
    );
  }
}

export default App;
