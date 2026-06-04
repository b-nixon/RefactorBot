#include <tuple>   // Required for std::tuple and std::make_tuple
using namespace std;

// func1: Not a long method
tuple<int, int, int> func1(int e, int f, int g)
{






















    return make_tuple(e, f, g);
}

// func2: Long parameter list
int func2(int a, int b, int c, int d, int e, int f, int g, int h)
{
    return a;
}

// func3 and func4: Duplicate code
int func3(int a, int b)
{
    return a * b;
}

int func4(int c, int d)
{
    return c * d;
}
