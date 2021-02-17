import React from 'react';
import './App.css';
import Login from './Login';
import CheckLogin from './CheckLogin';
import { Button, Switch, Steps, Slider, Descriptions, PageHeader, Tag, Alert, Space } from 'antd';
import { UserOutlined, SolutionOutlined, LoadingOutlined, SmileOutlined } from '@ant-design/icons';

const { Step } = Steps;

class App extends React.Component {
  state = {
    status: "idle",
    pure: "close",
    waste: "close",
    salt: "close",
    wasteTime: 180,
    refillTime: 1200,
    schedulerInterval: 3,
    schedulerRunningInterval: 0,
    schedulerWasteRequestTime: 0,
    schedulerRefillRequestTime: 0,
    user: null
  };

  componentDidMount() {
    this.getStatus();
    this.interval = setInterval(() => this.getStatus(), 1000);
    this.checkLogin();
  }

  checkLogin = () => {
    fetch("/login")
      .then(response => response.json())
      .then(response => {
        console.log(response);
        this.setState({ 
          user: response.user
        });
      });
  }

  getStatus = () => {
    if(this.state.user){
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
          remainRefillTime: response.remainRefillTime,
          schedulerStatus: response.schedulerStatus,
          schedulerRunningInterval: response.schedulerInterval,
          schedulerWasteRequestTime: response.schedulerWasteRequestTime,
          schedulerRefillRequestTime: response.schedulerRefillRequestTime
        });
      }).catch((error) => {
        console.error(error);
        this.setState({user:""});
      });
    }
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

  setSchedule = () => {
    fetch("/api/schedule", {
      method:"POST",
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        type: "timerchange",
        interval: this.state.schedulerInterval,
        wasteTime: this.state.wasteTime,
        refillTime: this.state.refillTime
      })
    })
      .then(response => {
        console.log(response);
        this.getStatus();
      });
  }

  stopSchedule = () => {
    fetch("/api/schedule", {
      method:"DELETE"
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

  schedulerIntervalValue = (value) => {
    this.setState({
      schedulerInterval: value
    })
  }

  loginResult = (response) => {
    this.checkLogin();
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
    var emptyError = <div></div>;
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

      emptyError = <Alert
        message="Error"
        description="보충 해수가 비었습니다. 새로 해수를 만들어 주세요."
        type="error"
        showIcon
      />;
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

    const scheduleMarks = {
      1: '1회',
      2: '2회',
      3: '3회',
      4: '4회',
      5: '5회',
      6: '6회',
      7: '7회',
      8: '8회',
      9: '9회',
      10: '10회'
    };

    var scheduler = <>
    <Descriptions.Item>
      <Slider style={{width:"300px"}} marks={scheduleMarks} step={1} min={1} max={5} defaultValue={3} onChange={this.schedulerIntervalValue} />
    </Descriptions.Item>
    <Descriptions.Item>
      <Space>
        <Button type="primary" size="small" onClick={() => this.setSchedule()}>
          Set Schedule
        </Button>
        <Button type="primary" size="small" onClick={() => this.stopSchedule()}>
          Stop Schedule
        </Button>
      </Space>
    </Descriptions.Item>
    </>;

    var schedulerStatus = <div></div>;

    if(this.state.schedulerRunningInterval > 0){
      schedulerStatus = <Descriptions.Item>
        <Alert message={"현재 스케쥴 - 하루 " + this.state.schedulerRunningInterval + "회 수행, 배수 시간 : " + this.state.schedulerWasteRequestTime + "초, 보충 시간 : " + this.state.schedulerRefillRequestTime + "초"} type="success" />
      </Descriptions.Item>
    }

    var tempColor = "success";

    console.log(parseFloat(this.state.temperature));

    if(parseFloat(this.state.temperature) > 27.0 || parseFloat(this.state.temperature) < 25.0){
      tempColor = "error";
    }

    const kibana = {__html: '<iframe src="http://192.168.0.13:5601/app/dashboards#/view/cb402280-42f9-11eb-b53b-c363278ce9c2?embed=true&_g=(filters%3A!()%2CrefreshInterval%3A(pause%3A!t%2Cvalue%3A0)%2Ctime%3A(from%3Anow-2d%2Cto%3Anow))&hide-filter-bar=true" height="600" width="1200"></iframe>'};

    if(this.state.user == null){
      return (
        <CheckLogin />
      )
    }
    else if(this.state.user === ""){
      return (
        <Login loginResult={this.loginResult} />
      )
    }
    else {
      return (
        <div className="App">
          <header className="App-header">
            {emptyError}
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
              <Slider style={{width:"300px"}} marks={refillMarks} step={10} min={60} max={1800} defaultValue={1200} disabled={inputDisable} onChange={this.refillTimeValue} />
            </Descriptions.Item>
            <Descriptions.Item>
              <Button type="primary" size="small" loading={autoWorking} onClick={() => this.enterTimerChange()}>
                Timer Change
              </Button>
            </Descriptions.Item>
            {timer}
            {scheduler}
            {schedulerStatus}
            <Descriptions.Item>
              <div dangerouslySetInnerHTML={ kibana } />
            </Descriptions.Item>
          </Descriptions>
         </PageHeader>
         </header>
        </div>
      );
    }
  }
}

export default App;
