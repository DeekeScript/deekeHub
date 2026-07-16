### docker安装


#### 1. 更新依赖
```
sudo apt update
sudo apt install apt-transport-https ca-certificates curl gnupg-agent software-properties-common
```

#### 2. curl 导入源仓库的 GPG key
```
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
```

#### 3. 将 Docker APT 软件源添加到你的系统
```
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
```

#### 4. 安装 Docker Engine
```
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io
```
> 如需指定版本，可以使用下面的代码：

```
sudo apt install docker-ce=<VERSION> docker-ce-cli=<VERSION> containerd.io
```

#### 5.docker服务开机自启动
```
sudo systemctl enable docker
```
