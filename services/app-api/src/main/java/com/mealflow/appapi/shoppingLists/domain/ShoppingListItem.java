package com.mealflow.appapi.shoppingLists.domain;

public class ShoppingListItem {

    private String id;
    private String name;
    private Double quantity;
    private String unit;
    private boolean checked;
    private ShoppingItemCategory category;

    public ShoppingListItem() {}

    public ShoppingListItem(String id, String name, Double quantity, String unit, boolean checked) {
        this(id, name, quantity, unit, checked, null);
    }

    public ShoppingListItem(
            String id, String name, Double quantity, String unit, boolean checked, ShoppingItemCategory category) {
        this.id = id;
        this.name = name;
        this.quantity = quantity;
        this.unit = unit;
        this.checked = checked;
        this.category = category;
    }

    /** Never null — items stored before categories existed read back as OTHER. */
    public ShoppingItemCategory getCategory() {
        return category == null ? ShoppingItemCategory.OTHER : category;
    }

    public void setCategory(ShoppingItemCategory category) {
        this.category = category;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Double getQuantity() {
        return quantity;
    }

    public void setQuantity(Double quantity) {
        this.quantity = quantity;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public boolean isChecked() {
        return checked;
    }

    public void setChecked(boolean checked) {
        this.checked = checked;
    }
}
