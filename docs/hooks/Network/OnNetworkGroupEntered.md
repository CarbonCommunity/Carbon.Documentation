<Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
# OnNetworkGroupEntered
Called when an entity or player enters a network group (area of visibility).
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnNetworkGroupEntered()
{
	Puts("OnNetworkGroupEntered has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ BaseNetworkable]
public virtual void OnNetworkGroupEnter(Network.Visibility.Group group)
{
}

```
:::
