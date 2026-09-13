package com.mealflow.appapi.recipes.domain;

/**
 * How a recipe's image is framed: the point of the image (x, y as fractions of its width and
 * height, 0–1) that should sit at the centre of whatever box displays it, and how far to zoom in
 * beyond a plain "cover" fit (1 = no extra zoom).
 *
 * <p>Stored instead of a cropped copy because the app shows the same image at several aspect
 * ratios — a focal point keeps the dish in view in all of them, and the original stays untouched
 * so the user can re-frame it later. Null means centred.
 */
public class ImageFocus {

    private double x;
    private double y;
    private double zoom;

    public ImageFocus() {}

    public ImageFocus(double x, double y, double zoom) {
        this.x = x;
        this.y = y;
        this.zoom = zoom;
    }

    public double getX() {
        return x;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getY() {
        return y;
    }

    public void setY(double y) {
        this.y = y;
    }

    public double getZoom() {
        return zoom;
    }

    public void setZoom(double zoom) {
        this.zoom = zoom;
    }
}
