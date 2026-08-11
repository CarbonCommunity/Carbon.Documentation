using UnityEngine;

public class Processor : MonoBehaviour
{
	public static Processor Instance;

	public string bundleName;

	public PrefabLookup prefabs;

	public void Start()
	{
		Instance = this;
		prefabs = new PrefabLookup(bundleName);
	}

	[ContextMenu("Load Assets")]
	public void DoLoad()
	{
		Start();
	}
}
