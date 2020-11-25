import React from 'react';
import './App.css';
import { Button } from 'antd';

class App extends React.Component {
  componentDidMount() {
    this.interval = setInterval(() => this.getStatus(), 1000);
  }

  getStatus = () => {
    fetch("/api/status")
      .then(response => response.json())
      .then(response => {
        console.log(response);
      });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <Button>Open Pure Water Valve</Button>
          <Button>Open Waste Water Valve</Button>
          <Button>Open Salt Water Valve</Button>
        </header>
      </div>
    );
  }
}

export default App;
