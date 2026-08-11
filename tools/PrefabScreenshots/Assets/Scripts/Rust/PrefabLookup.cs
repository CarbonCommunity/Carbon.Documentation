using System;
using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

public class PrefabLookup : System.IDisposable
{
	private AssetBundleBackend backend;

	public List<uint> prefabsList = new();

	internal const string manifestPath = "assets/manifest.asset";
	internal GameManifest manifest;

	public static uint ManifestHash(string str)
	{
		return string.IsNullOrEmpty(str) ? 0 : BitConverter.ToUInt32(new MD5CryptoServiceProvider().ComputeHash(Encoding.UTF8.GetBytes(str)), 0);
	}

	public PrefabLookup(string bundlename)
	{
		Debug.Log($"Loading Rust root bundle: {bundlename}");

		backend = new AssetBundleBackend(bundlename);

		Debug.Log($" Found {backend.bundles.Count:n0} bundles...");
		Debug.Log($" Found {backend.bundles.Sum(x => x.Value.GetAllAssetNames().Length):n0} assets...");

		manifest = backend.Load<GameManifest>(manifestPath);

		Debug.Log($"Prewarming prefabs...");

		for (int i = 0; i < manifest.pooledStrings.Length; i++)
		{
			HashLookup.Global.Add(manifest.pooledStrings[i].str);
		}

		for (int i = 0; i < manifest.entities.Length; i++)
		{
			HashLookup.Global.Add(manifest.entities[i]);
		}

		foreach (var bundle in backend.bundles.Values)
		{
			if (bundle.isStreamedSceneAssetBundle)
			{
				continue;
			}

			var assets = bundle.GetAllAssetNames();
			foreach (var asset in assets)
			{
				var id = HashLookup.Global.Add(asset);
				if (asset.EndsWith(".prefab", StringComparison.CurrentCultureIgnoreCase))
				{
					prefabsList.Add(id);
				}
			}
		}
	}

	public GameObject GetAsset(uint asset)
	{
		foreach (var bundle in backend.bundles.Values)
		{
			if (bundle.isStreamedSceneAssetBundle)
			{
				continue;
			}

			var assetName = HashLookup.Global[asset];
			if(string.IsNullOrEmpty(assetName))
			{
				continue;
			}
			if (bundle.LoadAsset<GameObject>(assetName) is GameObject go)
			{
				return go;
			}
		}
		return null;
	}

	public void Dispose()
	{
		backend.Dispose();
		backend = null;

		Debug.Log($"Disposed Rust's asset bundles. Clean-up complete.");
	}

	public GameObject this[string name]
	{
		get
		{
			return backend.Load<GameObject>(name);
		}
	}

	public uint GetRustUID(string name)
	{
		return manifest.pooledStrings.FirstOrDefault(x => x.str.Equals(name, StringComparison.CurrentCultureIgnoreCase)).hash;
	}
}
