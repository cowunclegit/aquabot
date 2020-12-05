import React from 'react';
import './App.css';
import { Space, Spin } from 'antd';

class CheckLogin extends React.Component {
    render() {
        return <div className="App">
        <header className="App-header">
            <Space size="middle">
                <Spin size="large" />
                Check Login status...
            </Space>
        </header>
        </div>;
    }
}

export default CheckLogin;