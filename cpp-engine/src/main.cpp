#include <iostream>
#include <thread>
#include <chrono>
#include <random>
#include <map>
#include <cmath>
#include <json.hpp>

using json = nlohmann::json;

const int NUM_LEVELS = 100;
const double TICK_SIZE = 0.5;

int main() {
    std::mt19937 rng(1337); 
    std::uniform_int_distribution<int> ms_dist(20, 50); // 20-50 fps
    std::normal_distribution<double> price_walk(0.0, 0.4); 
    std::uniform_int_distribution<int> noise(-20, 20); 

    double current_price = 10000.0;
    
    std::map<double, int, std::greater<double>> bids;
    std::map<double, int> asks;

    auto init_level = [](double px) {
        int base = 50 + rand() % 100;
        if (std::abs(std::fmod(px, 10.0)) < 0.05) base += 200; // heavy round numbers
        return base;
    };

    while(true) {
        // Random walk the price
        double move = price_walk(rng);
        current_price += move;
        double center = std::round(current_price / TICK_SIZE) * TICK_SIZE;

        // Clean up crossed levels (Market Orders eating the book)
        auto it_ask = asks.begin();
        while(it_ask != asks.end() && it_ask->first <= center) {
            it_ask = asks.erase(it_ask);
        }
        auto it_bid = bids.begin();
        while(it_bid != bids.end() && it_bid->first >= center) {
            it_bid = bids.erase(it_bid);
        }

        json j_bids = json::array();
        json j_asks = json::array();

        for(int i=1; i<=NUM_LEVELS; ++i) {
            // Manage Bids
            double bid_px = center - (i * TICK_SIZE);
            if(bids.find(bid_px) == bids.end()) {
                bids[bid_px] = init_level(bid_px);
            } else {
                int target = init_level(bid_px);
                // mean reversion to target + noise
                bids[bid_px] = bids[bid_px] + 0.1*(target - bids[bid_px]) + noise(rng);
            }
            bids[bid_px] = std::max(0, bids[bid_px]);
            bids[bid_px] = std::min(500, bids[bid_px]); // Cap volume to 500 max
            if (bids[bid_px] > 0) j_bids.push_back({bid_px, bids[bid_px]});

            // Manage Asks
            double ask_px = center + (i * TICK_SIZE);
            if(asks.find(ask_px) == asks.end()) {
                asks[ask_px] = init_level(ask_px);
            } else {
                int target = init_level(ask_px);
                asks[ask_px] = asks[ask_px] + 0.1*(target - asks[ask_px]) + noise(rng);
            }
            asks[ask_px] = std::max(0, asks[ask_px]);
            asks[ask_px] = std::min(500, asks[ask_px]); // Cap volume to 500 max
            if (asks[ask_px] > 0) j_asks.push_back({ask_px, asks[ask_px]});
        }

        json j;
        j["type"] = "snapshot";
        j["price"] = center;
        j["bids"] = j_bids;
        j["asks"] = j_asks;

        std::cout << j.dump() << std::endl;

        std::this_thread::sleep_for(std::chrono::milliseconds(ms_dist(rng)));
    }

    return 0;
}
