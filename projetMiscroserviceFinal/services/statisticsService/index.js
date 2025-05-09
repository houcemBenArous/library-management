const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const statistics = {};

const PROTO_PATH = path.join(__dirname, 'statistics.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const statisticsProto = grpc.loadPackageDefinition(packageDefinition).statistics;

function addStatistic(call, callback) {
    const { bookId, userId } = call.request;
    if (!statistics[bookId]) statistics[bookId] = 0;
    statistics[bookId]++;
    callback(null, { success: true });
}

function getStatistics(call, callback) {
    callback(null, { stats: statistics });
}

function main() {
    const server = new grpc.Server();
    server.addService(statisticsProto.Statistics.service, {
        addStatistic,
        getStatistics
    });
    server.bindAsync('0.0.0.0:50053', grpc.ServerCredentials.createInsecure(), () => {
        console.log('StatisticsService running on port 50053');
        server.start();
    });
}

main();