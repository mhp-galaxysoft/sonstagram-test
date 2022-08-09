// 배포 서버에서 export NODE_ENV=production 이라고 치면 배포 환경으로 만들 수 있음
// windows 운영체제에선 set NODE_ENV=production
// 그 외에는 development 환경
const env = process.env.NODE_ENV || "production";

const development = {
  app: {
    port: 3000,
  },
  dbFactory: {
    host: "13.125.106.238",
    user: "galaxy_remote",
    database: "test",
    password: "fwwsdfjmoi32j01klsafd3",
    port: 3306,
    connectionLimit: 1,
    waitForConnections: false,
  },
  path: {
    profile : "uploads/profile/",
    product : "uploads/product/",
    feed : "uploads/feed/",
    live : 'uploads/live/',
    review : 'uploads/review/',
    factory : 'uploads/factory/'
  },
  link : {
    url : "http://localhost:3000"
  }
};

const production = {
  app: {
    port: 3000,
  },
  dbFactory: {
    host: "13.125.106.238",
    user: "galaxy_remote",
    database: "test",
    password: "fwwsdfjmoi32j01klsafd3",
    port: 3306,
    connectionLimit: 100,
    waitForConnections: true,
  },
  path: {
    profile : "uploads/profile/",
    product : "uploads/product/",
    feed : "uploads/feed/",
    live : 'uploads/live/',
    review : 'uploads/review/',
    factory : 'uploads/factory/'
  },
  link : {
    url : "https://livefactory.kr"
  }
};

const config = {
  development,
  production,
};

module.exports = config[env];
