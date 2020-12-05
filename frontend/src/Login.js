import React from 'react';
import './App.css';
import { Form, Input, Button, Checkbox, Row, Col } from 'antd';

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};
const tailLayout = {
  wrapperCol: { offset: 8, span: 16 },
};

class Login extends React.Component {
    onFinish = (values) => {
        fetch("/login", {
            method:"POST",
            headers: {
                'Content-type': 'application/json'
            },
            body: JSON.stringify(values)
        })
        .then(response => {
            console.log(response);
            this.props.loginResult(response);
        });
    };

    render() {
        return <div className="App">
            <Row>
      <Col span={24}>&nbsp;</Col>
    </Row>
            <Row>
      <Col span={24}>
          <h3>AQUA BOT - Marine Automation System</h3>
          <br />
          </Col>
    </Row>
    <Row>
      <Col span={4}></Col>
      <Col span={16}>
          <Form
            {...layout}
            name="basic"
            onFinish={this.onFinish}
            >
            <Form.Item
                label="Username"
                name="id"
                rules={[{ required: true, message: 'Please input your username!' }]}
            >
                <Input />
            </Form.Item>

            <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: 'Please input your password!' }]}
            >
                <Input.Password />
            </Form.Item>

            <Form.Item {...tailLayout}>
                <Button type="primary" htmlType="submit">
                Submit
                </Button>
            </Form.Item>
            </Form>
      </Col>
      <Col span={4}></Col>
    </Row>
            
        </div>;
    }
}

export default Login;