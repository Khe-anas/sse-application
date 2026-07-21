package com.sse.enums;

public enum Niveau {
    N0(0),
    N1(1),
    N2(2),
    N3(3);

    private final int points;

    Niveau(int points) {
        this.points = points;
    }

    public int getPoints() {
        return points;
    }

    public static int maxPoints() {
        return java.util.Arrays.stream(values())
            .mapToInt(Niveau::getPoints)
            .max()
            .orElse(0);
    }
}
