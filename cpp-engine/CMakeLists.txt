cmake_minimum_required(VERSION 3.10)
project(BookmapSimulator VERSION 1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# Enable release optimization
set(CMAKE_CXX_FLAGS_RELEASE "-O3")

include_directories(include)

add_executable(simulator src/main.cpp)
